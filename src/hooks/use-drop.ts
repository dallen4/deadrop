import { useCrypto } from './use-crypto';
import { useMachine } from '@xstate/react/lib/useMachine';
import { assign, dropMachine } from '@lib/machines/drop';
import { DropEventType, DropState, DROP_PATH, MessageType } from '@lib/constants';
import type {
    CompleteEvent,
    ConnectEvent,
    HandshakeCompleteEvent,
    InitDropEvent,
    WrapEvent,
} from 'types/events';
import { generateGrabUrl } from '@lib/util';
import { post } from '@lib/fetch';
import { InitDropResult } from 'types/common';
import {
    BaseMessage,
    ConfirmIntegrityMessage,
    DropMessage,
    HandshakeMessage,
    VerifyMessage,
} from 'types/messages';

export const useDrop = () => {
    const {
        generateKeyPair,
        exportKey,
        importKey,
        deriveKey,
        generateId,
        encrypt,
        hash,
    } = useCrypto();

    const [{ value: state, context }, send] = useMachine(dropMachine, {
        actions: {
            initDrop: (context, { id, peer, keyPair, nonce }: InitDropEvent) => {
                assign({ id, peer, keyPair, nonce });
            },
            setMessage: (context, { payload, integrity }: WrapEvent) => {
                assign({ message: payload, integrity });
            },
            setConnection: (context, { connection }: ConnectEvent) => {
                assign({ connection });
            },
            sendPublicKey: async ({ connection, keyPair }, event) => {
                const pubKeyAsString = await exportKey(keyPair!.publicKey);

                const message: HandshakeMessage = {
                    type: MessageType.Handshake,
                    input: pubKeyAsString,
                };

                connection!.send(message);
            },
            setDropKey: (context, { dropKey }: HandshakeCompleteEvent) => {
                assign({ dropKey });
            },
        },
    });

    const init = async () => {
        const { initPeer } = await import('@lib/peer');

        const keyPair = await generateKeyPair();

        console.log('Key pair generated');

        const peerId = generateId();
        const peer = await initPeer(peerId);

        console.log(`Peer initialized: ${peerId}`);

        peer.on('connection', (connection) => {
            connection.on('data', async (msg: BaseMessage) => {
                if (msg.type === MessageType.Handshake) {
                    const { input } = msg as HandshakeMessage;

                    const pubKey = await importKey(input, ['encrypt']);
                    const dropKey = await deriveKey(context.keyPair!.privateKey, pubKey);

                    const event: HandshakeCompleteEvent = {
                        type: DropEventType.HandshakeComplete,
                        dropKey,
                    };

                    send(event);
                } else if (msg.type === MessageType.Verify) {
                    const { integrity } = msg as VerifyMessage;

                    if (integrity !== context.integrity!) throw new Error('uh oh');

                    const message: ConfirmIntegrityMessage = {
                        type: MessageType.ConfirmVerification,
                    };

                    connection.send(message);

                    const event: CompleteEvent = {
                        type: DropEventType.Confirm,
                    };

                    send(event);
                } else {
                    console.error(`Invalid message received: ${msg.type}`);
                }
            });

            send({ type: DropEventType.Connect, connection });
        });

        const { id, nonce } = await post<InitDropResult, { id: string }>(DROP_PATH, {
            id: peer.id,
        });
        console.log('DROP READY');

        const event: InitDropEvent = {
            type: DropEventType.Init,
            id,
            peer,
            keyPair,
            nonce,
        };

        send(event);
    };

    const setPayload = async (message: string) => {
        const payload = {
            message,
        };

        const integrity = await hash(payload);

        const event: WrapEvent = {
            type: DropEventType.Wrap,
            payload,
            integrity,
        };

        send(event);
    };

    const getDropLink = () => generateGrabUrl(context.id!);

    const startHandshake = async () => {
        const { connection, keyPair } = context;

        const pubKeyAsString = await exportKey(keyPair!.publicKey);

        const message: HandshakeMessage = {
            type: MessageType.Handshake,
            input: pubKeyAsString,
        };

        connection!.send(message);
    };

    const drop = async () => {
        const payload = await encrypt(context.dropKey!, context.nonce!, context.message);

        const message: DropMessage = {
            type: MessageType.Payload,
            payload,
        };

        context.connection!.send(message);

        send({ type: DropEventType.Drop });
    };

    return {
        init,
        setPayload,
        getDropLink,
        startHandshake,
        drop,
        status: state as DropState,
    };
};
