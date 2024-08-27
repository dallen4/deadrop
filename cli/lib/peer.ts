import { createPeer } from '@shared/lib/peer';

export const initPeer = () =>
  createPeer(process.env.PEER_SERVER_URL!, {
    username: 'peerjs',
    credential: 'peerjs',
  });
