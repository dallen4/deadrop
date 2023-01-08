import { createPeer } from '@shared/lib/peer';

export const initPeer = (id: string) =>
    createPeer(id, process.env.NEXT_PUBLIC_PEER_SERVER_URL!);
