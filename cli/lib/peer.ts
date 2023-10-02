import type Peer from 'peerjs';
import { createPeer } from '@shared/lib/peer';

export const initPeer = () =>
    createPeer(process.env.PEER_SERVER_URL!);

export const cleanupPeer = (peer: Peer) => {
    peer.disconnect();
};
