import { createPeer } from '@shared/lib/peer';
import type { IceServerCredentials } from '@shared/types/peer';
import type { ExtensionConfig } from '../../../src/types';

export const initPeerFromConfig = (
  config: ExtensionConfig,
  creds: IceServerCredentials,
  id?: string,
) => createPeer(config.peerServerUrl, creds, id);
