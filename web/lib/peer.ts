import { createPeer } from '@shared/lib/peer';

export const initPeer = () =>
    createPeer(process.env.NEXT_PUBLIC_PEER_SERVER_URL!, {
        username: process.env.NEXT_PUBLIC_TURN_USERNAME!,
        credential: process.env.NEXT_PUBLIC_TURN_PWD!,
    });
