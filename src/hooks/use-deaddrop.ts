import { useCrypto } from './use-crypto';
import { nanoid } from 'nanoid';
import localForage from 'localforage';
import { useRef, useState } from 'react';
import Peer, { DataConnection } from 'peerjs';

export const useDeadDrop = () => {
    const peer = useRef<Peer>();
    const [connection, setConnection] = useState<DataConnection>();

    const { generateKeyPair, deriveKey, generateId, encrypt, decrypt } = useCrypto();
    const keyPair = useRef<CryptoKeyPair>();
    const peerPubKey = useRef<CryptoKey>();

    const init = async () => {
        const { initPeer } = await import('@lib/peer');

        const id =
            (await localForage.getItem<string>('drop-session-id')) ||
            (await localForage.setItem<string>('drop-session-id', generateId()));

        peer.current = await initPeer(id);
        keyPair.current = await generateKeyPair();
    };

    const getPublicKey = () => keyPair.current!.publicKey;

    const getSharedKey = (peerPublicKey: CryptoKey) =>
        deriveKey(keyPair.current!.privateKey, peerPublicKey);

    const drop = async (input: Record<string, any>, peerPublicKey: CryptoKey) => {
        const id = peer.current!.id;

        const encryptionKey = await getSharedKey(peerPublicKey);
        const encrypted = await encrypt(encryptionKey, id, input);

        connection!.send({ data: encrypted });
    };

    const pickup = async (payload: string) => {
        const iv = connection!.peer;
    };

    return {
        init,
        drop,
    };
};
