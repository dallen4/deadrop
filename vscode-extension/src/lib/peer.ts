import { createPeer } from '@shared/lib/peer';

// NOTE may need shim

export const initPeer = (id: string) =>
    createPeer(id, process.env.REACT_APP_PEER_SERVER_URL!);
