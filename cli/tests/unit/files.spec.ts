import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import os from 'os';
import path from 'path';
import { writeFileFromBuffer } from '../../lib/files';

describe('writeFileFromBuffer', () => {
  let root: string;
  let cwd: string;

  beforeEach(() => {
    root = mkdtempSync(path.join(os.tmpdir(), 'deadrop-files-'));
    cwd = path.join(root, 'cwd');
    mkdirSync(cwd);
    vi.spyOn(process, 'cwd').mockReturnValue(cwd);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(root, { recursive: true, force: true });
  });

  const write = (name: string) =>
    writeFileFromBuffer(new TextEncoder().encode('x'), {
      name,
      type: 'text/plain',
    } as never);

  it.each([
    '../escaped.txt',
    'a/../../escaped.txt',
    '..\\escaped.txt',
  ])('keeps %j inside the working directory', async (name) => {
    const written = await write(name);

    expect(path.dirname(written)).toBe(cwd);
    expect(existsSync(path.join(root, 'escaped.txt'))).toBe(false);
  });

  it('ignores an absolute path from the dropper', async () => {
    const written = await write(path.join(root, 'abs.txt'));

    expect(written).toBe(path.join(cwd, 'abs.txt'));
    expect(existsSync(path.join(root, 'abs.txt'))).toBe(false);
  });

  it('never overwrites an existing file', async () => {
    writeFileSync(path.join(cwd, 'notes.txt'), 'mine');

    const written = await write('notes.txt');

    expect(written).toBe(path.join(cwd, 'notes (1).txt'));
    expect(readFileSync(path.join(cwd, 'notes.txt'), 'utf8')).toBe(
      'mine',
    );
  });

  it.each(['..', '.', ''])('rejects %j', async (name) => {
    await expect(write(name)).rejects.toThrow();
  });
});
