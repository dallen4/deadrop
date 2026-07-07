import chalk from 'chalk';
import Ora from 'ora';
import type { Color } from 'ora';
import { GrabberStatus } from '@shared/types/drop';
import type { GrabberRecord } from '@shared/types/drop';

export const loader = Ora();

export const startLoader = (msg: string) => loader.start(msg);

export const setMessage = (msg: string) => (loader.text = msg);

export const setSpinnerColor = (color: Color) =>
  (loader.color = color);

export const stopWithSuccess = (msg: string) => loader.succeed(msg);

export const stopWithWarn = (msg: string) => loader.warn(msg);

export const stopWithFail = (msg: string) => loader.fail(msg);

const STATUS_LABEL: Record<GrabberStatus, string> = {
  [GrabberStatus.Connected]: 'connected',
  [GrabberStatus.Transferring]: 'transferring',
  [GrabberStatus.Confirmed]: 'confirmed',
  [GrabberStatus.Failed]: 'failed',
};

const STATUS_COLOR: Record<GrabberStatus, (msg: string) => string> = {
  [GrabberStatus.Connected]: chalk.yellow,
  [GrabberStatus.Transferring]: chalk.cyan,
  [GrabberStatus.Confirmed]: chalk.green,
  [GrabberStatus.Failed]: chalk.red,
};

const shortPeerId = (peerId: string) => peerId.slice(0, 8);

const elapsedSeconds = (grabber: GrabberRecord) => {
  const end = grabber.confirmedAt ?? Date.now();

  return ((end - grabber.connectedAt) / 1000).toFixed(1);
};

const toList = (
  grabbers: Map<string, GrabberRecord> | GrabberRecord[],
) => (Array.isArray(grabbers) ? grabbers : [...grabbers.values()]);

// pure formatting, kept separate from the stateful terminal redraw below
// so it's easy to unit test
export const renderGrabberRows = (
  grabbers: Map<string, GrabberRecord> | GrabberRecord[],
): string[] => {
  const list = toList(grabbers);

  if (list.length === 0)
    return [chalk.dim('  No grabbers connected yet...')];

  return list.map((grabber) => {
    const color = STATUS_COLOR[grabber.status];
    const id = shortPeerId(grabber.peerId).padEnd(8);
    const status = color(STATUS_LABEL[grabber.status].padEnd(12));

    return `  ${id}  ${status}  ${elapsedSeconds(grabber)}s`;
  });
};

export const renderGrabberList = (
  grabbers: Map<string, GrabberRecord> | GrabberRecord[],
  maxGrabbers: number | null,
): string => {
  const list = toList(grabbers);
  const confirmed = list.filter(
    (grabber) => grabber.status === GrabberStatus.Confirmed,
  ).length;
  const capLabel = maxGrabbers == null ? 'unbounded' : maxGrabbers;

  const header = chalk.bold(
    `Grabbers (${confirmed}/${capLabel} confirmed)`,
  );

  return [header, ...renderGrabberRows(list)].join('\n');
};

// tracks how many lines were printed last so the next render can clear
// just that block instead of scrolling the terminal
let lastRenderedLines = 0;

export const printGrabberList = (
  grabbers: Map<string, GrabberRecord> | GrabberRecord[],
  maxGrabbers: number | null,
) => {
  if (lastRenderedLines > 0 && process.stdout.isTTY) {
    process.stdout.moveCursor(0, -lastRenderedLines);
    process.stdout.clearScreenDown();
  }

  const text = renderGrabberList(grabbers, maxGrabbers);

  process.stdout.write(text + '\n');

  lastRenderedLines = text.split('\n').length;
};

export const resetGrabberList = () => {
  lastRenderedLines = 0;
};
