import { generateGrabUrl as baseGenerateGrabUrl } from '@shared/lib/util';
import { WEB_URL } from '../env';

// Grab links point at the public web origin, NOT this desktop window — a
// grabber opens them in a browser or a second peer.
export const generateGrabUrl = (id: string) =>
  baseGenerateGrabUrl(WEB_URL, id);

// Tauri rejects with the Rust command's plain string, not an Error.
export const errorMessage = (err: unknown) =>
  err instanceof Error ? err.message : String(err);
