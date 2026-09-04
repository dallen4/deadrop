import { spawn } from 'child_process';

// Value is piped over stdin, never passed as an argument — argv is visible
// to any process listing.
const COPY_COMMAND: Record<string, [string, string[]]> = {
  darwin: ['pbcopy', []],
  win32: ['clip.exe', []],
  linux: ['xclip', ['-selection', 'clipboard']],
};

export function copyToClipboard(value: string): Promise<boolean> {
  const command = COPY_COMMAND[process.platform];

  if (!command) return Promise.resolve(false);

  const [cmd, args] = command;

  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      stdio: ['pipe', 'ignore', 'ignore'],
    });

    // xclip is not installed by default on every distro.
    child.on('error', () => resolve(false));
    child.on('close', (code) => resolve(code === 0));

    child.stdin.end(value);
  });
}
