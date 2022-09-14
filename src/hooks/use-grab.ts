import { assign, grabMachine } from '@lib/machines/grab';
import localForage from 'localforage';
import { useMachine } from '@xstate/react/lib/useMachine';
import { useCrypto } from './use-crypto';
import { InitGrabEvent } from 'types/events';
import { GrabEventType } from '@lib/constants';

export const useGrab = () => {
    const { generateKeyPair, deriveKey, generateId, decrypt, hash } = useCrypto();

    const [{ context, value: state }, send] = useMachine(grabMachine, {
        actions: {
            initDrop: async (context, event: InitGrabEvent) => {
                const { initPeer } = await import('@lib/peer');

                const id = generateId();

                const peer = await initPeer(id);
                const keyPair = await generateKeyPair();

                peer.on('connection', (connection) => {
                    send({ type: GrabEventType.Connect, connection });
                });

                assign({ peer, keyPair });
            },
        },
    });
};
