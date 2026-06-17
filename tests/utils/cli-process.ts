import { execa, type ResultPromise } from 'execa';
import { cliEntry } from './config';

// chalk wraps CLI output in ANSI color codes (and figlet/QR add decoration);
// strip them so we match against plain text.
// eslint-disable-next-line no-control-regex
const ANSI = /\[[0-9;]*m/g;
const stripAnsi = (s: string) => s.replace(ANSI, '');

/**
 * A spawned `deadrop` process whose stdout we watch for expected lines. Ported
 * from cli/tests/e2e/util.ts so the cross-platform suite owns its copy.
 *
 * The drop process is long-lived (it waits for a grabber); the grab process is
 * short-lived. We resolve on a stdout pattern rather than exit code: the grab
 * path calls process.exit() right after logging the secret, so we read it from
 * the buffer rather than depend on process lifetime.
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
