import { useCrypto } from './use-crypto';
import { useMachine } from '@xstate/react/lib/useMachine';
import { assign, dropMachine } from '@lib/machines/drop';
import { DropEventType, DropState, DROP_API_PATH, MessageType } from '@lib/constants';
import type {
    CompleteEvent,
    ConnectEvent,
    HandshakeCompleteEvent,
    InitDropEvent,
    WrapEvent,
} from 'types/drop';
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
import { useRef } from 'react';

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

    const logsRef = useRef<Array<string>>([]);

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
                logsRef.current.push('Beginning key exchange handshake...');

                const pubKeyAsString = await exportKey(keyPair!.publicKey);

                const message: HandshakeMessage = {
                    type: MessageType.Handshake,
                    input: pubKeyAsString,
                };

                connection!.send(message);

                logsRef.current.push('Public key sent, awaiting acknowledgement...');
            },
            setDropKey: (context, { dropKey }: HandshakeCompleteEvent) => {
                assign({ dropKey });
            },
        },
    });

    const init = async () => {
        const { initPeer } = await import('@lib/peer');

        const keyPair = await generateKeyPair();

        logsRef.current.push('Key pair generated...');
        console.log('Key pair generated');

        const peerId = generateId();
        const peer = await initPeer(peerId);

        logsRef.current.push('Peer instance created successfully...');
        console.log(`Peer initialized: ${peerId}`);

        peer.on('connection', (connection) => {
            if (context.connection) {
                console.error('Drop connection already exists!');
                connection.close();
                return;
            }

            connection.on('data', async (msg: BaseMessage) => {
                if (msg.type === MessageType.Handshake) {
                    const { input } = msg as HandshakeMessage;

                    logsRef.current.push('Handshake acknowledged, deriving drop key...');

                    const pubKey = await importKey(input, ['deriveKey']);
                    const dropKey = await deriveKey(context.keyPair!.privateKey, pubKey);

                    logsRef.current.push('Drop key derived successfully...');

                    const event: HandshakeCompleteEvent = {
                        type: DropEventType.HandshakeComplete,
                        dropKey,
                    };

                    send(event);
                } else if (msg.type === MessageType.Verify) {
                    const { integrity } = msg as VerifyMessage;

                    logsRef.current.push('Integrity verification request received...');

                    const verified = integrity === context.integrity!;

                    logsRef.current.push(
                        `Integrity checked ${verified ? 'PASSED' : 'FAILED'}`,
                    );

                    const message: ConfirmIntegrityMessage = {
                        type: MessageType.ConfirmVerification,
                        verified,
                    };

                    connection.send(message);

                    logsRef.current.push(
                        'Integrity confirmation sent, completing drop...',
                    );

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

        const { id, nonce } = await post<InitDropResult, { id: string }>(DROP_API_PATH, {
            id: peer.id,
        });

        logsRef.current.push('Session is ready to begin drop...');
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

        logsRef.current.push('Staging & hashing payload for integrity checks...');

        const integrity = await hash(payload);

        const event: WrapEvent = {
            type: DropEventType.Wrap,
            payload,
            integrity,
        };

        send(event);
    };

    const dropLink = typeof window !== 'undefined' ? generateGrabUrl(context.id!) : null;

    const startHandshake = async () => {
        const { connection, keyPair } = context;

        logsRef.current.push('Beginning key exchange handshake...');

        const pubKeyAsString = await exportKey(keyPair!.publicKey);

        const message: HandshakeMessage = {
            type: MessageType.Handshake,
            input: pubKeyAsString,
        };

        connection!.send(message);
    };

    const drop = async () => {
        logsRef.current.push('Encrypting payload for drop...');

        const payload = await encrypt(context.dropKey!, context.nonce!, context.message);

        logsRef.current.push('Payload encrypted, dropping...');

        const message: DropMessage = {
            type: MessageType.Payload,
            payload,
        };

        context.connection!.send(message);

        logsRef.current.push('Payload dropped, awaiting response...');

        send({ type: DropEventType.Drop });
    };

    const getLogs = () => logsRef.current;

    return {
        init,
        setPayload,
        dropLink,
        startHandshake,
        drop,
        getLogs,
        status: state as DropState,
    };
};
