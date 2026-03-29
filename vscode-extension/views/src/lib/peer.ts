import { createPeer } from '@shared/lib/peer';
import type { ExtensionConfig } from '../../../src/types';

export const initPeerFromConfig = (config: ExtensionConfig) =>
  createPeer(config.peerServerUrl, {
    username: config.turnUsername,
    credential: config.turnPassword,
  });
