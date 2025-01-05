import { createPeer } from '@shared/lib/peer';

export const initPeer = () =>
  createPeer(process.env.PEER_SERVER_URL!, {
    username: process.env.TURN_USERNAME!,
    credential: process.env.TURN_PWD!,
  });
