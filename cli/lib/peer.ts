import { createPeer } from '@shared/lib/peer';
import type { IceServerCredentials } from '@shared/types/peer';

export const initPeer = (creds: IceServerCredentials, id?: string) =>
  createPeer(process.env.PEER_SERVER_URL!, creds, id);
