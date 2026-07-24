import { generateGrabUrl as baseGenerateGrabUrl } from '@shared/lib/util';
import { WEB_URL } from '../env';

// Grab links point at the public web origin, NOT this desktop window — a
// grabber opens them in a browser or a second peer.
export const generateGrabUrl = (id: string) =>
  baseGenerateGrabUrl(WEB_URL, id);
