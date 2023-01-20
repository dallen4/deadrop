import type Peer from 'peerjs';
import { createPeer } from '@shared/lib/peer';

export const initPeer = (id: string) =>
    createPeer(id, process.env.PEER_SERVER_URL!);

export const cleanupPeer = (peer: Peer) => {
    peer.disconnect();
};
