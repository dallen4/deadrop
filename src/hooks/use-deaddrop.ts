import { useCrypto } from './use-crypto';
import localForage from 'localforage';
import { useRef, useState } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { useMachine } from '@xstate/react';
import { dropMachine } from '@lib/machines';
import { DropEventType } from '../constants';
import { InitDropEvent } from 'types/events';
import { generatePickupUrl } from '@lib/util';

export const useDeadDrop = () => {
    const peer = useRef<Peer>();
    const [connection, setConnection] = useState<DataConnection>();

    const { generateKeyPair, deriveKey, generateId, encrypt, hash } = useCrypto();
    const keyPair = useRef<CryptoKeyPair>();
    const peerPubKey = useRef<CryptoKey>();

    const [state, send] = useMachine(dropMachine);

    const init = async () => {
        const { initPeer } = await import('@lib/peer');

        const id =
            (await localForage.getItem<string>('drop-session-id')) ||
            (await localForage.setItem<string>('drop-session-id', generateId()));

        peer.current = await initPeer(id);
        keyPair.current = await generateKeyPair();

        peer.current.on('connection', (connection) => {
            send({ type: DropEventType.Connect, connection });
        });

        send({
            type: DropEventType.Init,
            keyPair: keyPair.current,
            peer: peer.current,
        } as InitDropEvent);
    };

    const setDropMessage = async (message: string) => {
        const payload = {
            message,
        };

        const integrity = await hash(payload);

        send({ type: DropEventType.Wrap, payload, integrity });
    };

    const getPublicKey = () => keyPair.current!.publicKey;

    const getSharedKey = (peerPublicKey: CryptoKey) =>
        deriveKey(keyPair.current!.privateKey, peerPublicKey);

    const getDropLink = () => generatePickupUrl('');

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
        setDropMessage,
        getDropLink,
        drop,
        status: state.value,
    };
};
