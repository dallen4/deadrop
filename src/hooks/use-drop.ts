import { useCrypto } from './use-crypto';
import localForage from 'localforage';
import { useMachine } from '@xstate/react/lib/useMachine';
import { assign, dropMachine } from '@lib/machines/drop';
import { DropEventType } from '@lib/constants';
import { InitDropEvent } from 'types/events';
import { generatePickupUrl } from '@lib/util';

export const useDrop = () => {
    const { generateKeyPair, deriveKey, generateId, encrypt, hash } = useCrypto();

    const [state, send] = useMachine(dropMachine, {
        actions: {
            initDrop: async (context, event: InitDropEvent) => {
                const { initPeer } = await import('@lib/peer');

                const id =
                    (await localForage.getItem<string>('drop-session-id')) ||
                    (await localForage.setItem<string>('drop-session-id', generateId()));

                const peer = await initPeer(id);
                const keyPair = await generateKeyPair();

                peer.on('connection', (connection) => {
                    send({ type: DropEventType.Connect, connection });
                });

                assign({ peer, keyPair });
            },
        },
    });

    const init = () => send({ type: DropEventType.Init });

    const setDropMessage = async (message: string) => {
        const payload = {
            message,
        };

        const integrity = await hash(payload);

        send({ type: DropEventType.Wrap, payload, integrity });
    };

    const getSharedKey = (peerPublicKey: CryptoKey) =>
        deriveKey(state.context.keyPair!.privateKey, peerPublicKey);

    const getDropLink = () => generatePickupUrl('');

    const drop = async (input: Record<string, any>, peerPublicKey: CryptoKey) => {
        const id = state.context.peer!.id;

        const encryptionKey = await getSharedKey(peerPublicKey);
        const encrypted = await encrypt(encryptionKey, id, input);

        state.context.connection!.send({ data: encrypted });
    };

    const pickup = async (payload: string) => {
        const iv = state.context.connection!.peer;
    };

    return {
        init,
        setDropMessage,
        getDropLink,
        drop,
        status: state.value,
    };
};
