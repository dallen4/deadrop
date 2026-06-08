import { execa, type ResultPromise } from 'execa';
import { onTestFinished } from 'vitest';
import { apiURL, cliEntry, dropTimeout, grabTimeout } from './config';

// chalk wraps CLI output in ANSI color codes (and figlet/QR add decoration);
// strip them so we match against plain text.
// eslint-disable-next-line no-control-regex
const ANSI = /\[[0-9;]*m/g;
const stripAnsi = (s: string) => s.replace(ANSI, '');

// The drop test token is a stable value persisted in Redis under `test_tkn`
// (the worker verifies against it). It does not rotate per run, so suites just
// read it from the env — no seeding, no teardown, no cross-suite races. See
// DROP_TEST_TOKEN in cli/.env / the repo secret.
export const getTestToken = (): string => {
  const token = process.env.DROP_TEST_TOKEN;
  if (!token)
    throw new Error(
      'DROP_TEST_TOKEN is not set (expected in cli/.env locally or the ' +
        'repo secret in CI).',
    );
  return token;
};

/**
 * A spawned `deadrop` process whose stdout we watch for expected lines.
 * The drop process is long-lived (it waits for a grabber); the grab process
 * is short-lived. We resolve on a stdout pattern rather than exit code: the
 * grab path calls process.exit() immediately after logging the secret, so we
 * read it from the buffer rather than depend on process lifetime.
 */
export class CliProcess {
  readonly proc: ResultPromise;
  private buffer = '';

  constructor(args: string[], env: NodeJS.ProcessEnv) {
    // execa extends process.env with `env` by default, doesn't throw on a
    // non-zero exit (reject: false), and cleans up the child if the parent
    // exits. buffer: false so we own the streams for incremental matching.
    this.proc = execa(process.execPath, [cliEntry, ...args], {
      env,
      reject: false,
      buffer: false,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const collect = (chunk: Buffer) => {
      this.buffer += stripAnsi(chunk.toString());
    };
    this.proc.stdout?.on('data', collect);
    this.proc.stderr?.on('data', collect);
  }

  /** Resolve with the first regex match once it appears in stdout. */
  waitFor(pattern: RegExp, timeout: number): Promise<RegExpMatchArray> {
    return new Promise((resolve, reject) => {
      let done = false;
      const finish = (cb: () => void) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        this.proc.stdout?.off('data', onData);
        this.proc.stderr?.off('data', onData);
        cb();
      };
      const tryMatch = () => {
        const m = this.buffer.match(pattern);
        if (m) finish(() => resolve(m));
      };
      const onData = () => tryMatch();
      const timer = setTimeout(
        () =>
          finish(() =>
            reject(
              new Error(
                `Timed out after ${timeout}ms waiting for ${pattern}. ` +
                  `Output:\n${this.buffer}`,
              ),
            ),
          ),
        timeout,
      );
      // execa (reject: false) settles once the process ends and stdio has
      // flushed — do a final match before giving up, since the grabber prints
      // "Secret:" then immediately process.exit()s.
      const onEnd = () =>
        finish(() => {
          const m = this.buffer.match(pattern);
          if (m) resolve(m);
          else
            reject(
              new Error(
                `deadrop process ended before matching ${pattern}. ` +
                  `Output:\n${this.buffer}`,
              ),
            );
        });
      this.proc.stdout?.on('data', onData);
      this.proc.stderr?.on('data', onData);
      this.proc.then(onEnd, onEnd);
      tryMatch(); // in case the line already arrived
    });
  }

  kill() {
    this.proc.kill('SIGKILL');
  }
}

export type DropResult = {
  id: string;
  link: string;
  proc: CliProcess;
};

/** Spawn `deadrop drop <secret>`, return the parsed grab id + link. */
export const dropCli = async (secret: string): Promise<DropResult> => {
  const token = getTestToken();
  const cli = new CliProcess(['drop', secret], {
    DEADROP_API_URL: apiURL,
    TEST_TOKEN: token,
  });
  onTestFinished(() => cli.kill());
  const match = await cli.waitFor(/grab\?drop=([^\s&]+)/, dropTimeout);
  return { id: match[1], link: match[0], proc: cli };
};

/** Spawn `deadrop grab <id>`, resolve with the decrypted secret. */
export const grabCli = async (id: string): Promise<string> => {
  const cli = new CliProcess(['grab', id], {
    DEADROP_API_URL: apiURL,
  });
  onTestFinished(() => cli.kill());
  // grab handler logs: "Message validated!\n\nSecret: <value>"
  const match = await cli.waitFor(/Secret:\s*(.+)/, grabTimeout);
  return match[1].trim();
};
