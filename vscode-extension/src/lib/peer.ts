import { createPeer } from '@shared/lib/peer';

// NOTE may need shim

export const initPeer = () =>
    createPeer(process.env.REACT_APP_PEER_SERVER_URL!, {
        username: process.env.REACT_APP_TURN_USERNAME!,
        credential: process.env.REACT_APP_TURN_PWD!,
    });
