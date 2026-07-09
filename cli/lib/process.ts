import { spawn } from 'child_process';
import { constants } from 'os';

const FORWARDED: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGHUP'];

export function runWithEnv(
  cmd: string,
  args: string[],
  secrets: Record<string, string>,
  { override = true }: { override?: boolean } = {},
): Promise<number> {
  return new Promise((resolve, reject) => {
    const env = override
      ? { ...process.env, ...secrets }
      : { ...secrets, ...process.env };

    const child = spawn(cmd, args, {
      env,
      stdio: 'inherit',
      shell: false,
    });

    const forward = (sig: NodeJS.Signals) => child.kill(sig);
    FORWARDED.forEach((s) => process.on(s, forward));
    const cleanup = () =>
      FORWARDED.forEach((s) => process.off(s, forward));

    child.on('error', (err: NodeJS.ErrnoException) => {
      cleanup();
      if (err.code === 'ENOENT')
        reject(new Error(`Command not found: ${cmd}`));
      else reject(err);
    });

    child.on('exit', (code, signal) => {
      cleanup();
      if (signal) resolve(128 + (constants.signals[signal] ?? 0));
      else resolve(code ?? 0);
    });
  });
}
