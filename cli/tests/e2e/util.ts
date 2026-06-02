import { ChildProcess, spawn } from 'child_process';
import { onTestFinished } from 'vitest';
import { testTokenKey } from '@shared/tests/http';
import { apiURL, cliEntry, dropTimeout, grabTimeout } from './config';
import { getRedis } from './redis';

// chalk wraps CLI output in ANSI color codes (and figlet/QR add decoration);
// strip them so we match against plain text.
// eslint-disable-next-line no-control-regex
const ANSI = /\[[0-9;]*m/g;
const stripAnsi = (s: string) => s.replace(ANSI, '');

let cachedToken: string | null = null;

// The token is seeded by globalSetup, which runs in the main process; Vitest
// workers don't reliably inherit its env mutation, so read from Redis (the
// source of truth). Mirrors web util's fallback.
export const getOrCreateTestToken = async (): Promise<string> => {
  if (cachedToken) return cachedToken;
  cachedToken =
    process.env.TEST_TOKEN ??
    (await getRedis().get<string>(testTokenKey));
  if (!cachedToken)
    throw new Error(
      'No test token available (globalSetup did not seed it, and ' +
        'Redis has none). Check REDIS_REST_URL/REDIS_REST_TOKEN.',
    );
  return cachedToken;
};

/**
 * A spawned `deadrop` process whose stdout we watch for expected lines.
 * The drop process is long-lived (it waits for a grabber); the grab process
 * is short-lived. We resolve on a stdout pattern rather than exit code: the
 * grab path calls process.exit() immediately after logging the secret, so we
 * read it from the buffer rather than depend on process lifetime.
 */
export class CliProcess {
  readonly proc: ChildProcess;
  private buffer = '';

  constructor(args: string[], env: NodeJS.ProcessEnv) {
    this.proc = spawn(process.execPath, [cliEntry, ...args], {
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
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
      const tryMatch = () => {
        const m = this.buffer.match(pattern);
        if (m) {
          cleanup();
          resolve(m);
        }
      };
      const onData = () => tryMatch();
      // Use 'close' (not 'exit'): it fires after stdio has flushed, so the
      // grabber's final "Secret:" line is in the buffer even though it calls
      // process.exit() right after logging it. Do a final match before giving
      // up.
      const onClose = (code: number | null) => {
        const m = this.buffer.match(pattern);
        cleanup();
        if (m) resolve(m);
        else
          reject(
            new Error(
              `deadrop process closed (code ${code}) before matching ` +
                `${pattern}. Output:\n${this.buffer}`,
            ),
          );
      };
      const timer = setTimeout(() => {
        cleanup();
        reject(
          new Error(
            `Timed out after ${timeout}ms waiting for ${pattern}. ` +
              `Output:\n${this.buffer}`,
          ),
        );
      }, timeout);
      const cleanup = () => {
        clearTimeout(timer);
        this.proc.stdout?.off('data', onData);
        this.proc.stderr?.off('data', onData);
        this.proc.off('close', onClose);
      };
      this.proc.stdout?.on('data', onData);
      this.proc.stderr?.on('data', onData);
      this.proc.on('close', onClose);
      tryMatch(); // in case the line already arrived
    });
  }

  kill() {
    if (!this.proc.killed) this.proc.kill('SIGKILL');
  }
}

export type DropResult = {
  id: string;
  link: string;
  proc: CliProcess;
};

/** Spawn `deadrop drop <secret>`, return the parsed grab id + link. */
export const dropCli = async (secret: string): Promise<DropResult> => {
  const token = await getOrCreateTestToken();
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
