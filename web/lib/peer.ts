import type { IceServerCredentials } from '@shared/types/peer';

export const initPeer = async (
    creds: IceServerCredentials,
    id?: string,
) => {
    const { createPeer } = await import('@shared/lib/peer');

    return createPeer(
        process.env.NEXT_PUBLIC_PEER_SERVER_URL!,
        creds,
        id,
    );
};
