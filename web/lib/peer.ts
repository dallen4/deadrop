
export const initPeer = async () => {
    const { createPeer } = await import('@shared/lib/peer');

    return createPeer(import.meta.env.VITE_PEER_SERVER_URL!, {
        username: import.meta.env.VITE_TURN_USERNAME!,
        credential: import.meta.env.VITE_TURN_PWD!,
    });
};
