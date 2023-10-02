import { createPeer } from '@shared/lib/peer';

export const initPeer = () =>
    createPeer(process.env.NEXT_PUBLIC_PEER_SERVER_URL!);
