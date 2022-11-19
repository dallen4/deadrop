import { useRef } from 'react';
import { useCrypto } from './use-crypto';
import { useMachine } from '@xstate/react/lib/useMachine';
import { dropMachine, initDropContext } from '@lib/machines/drop';
import { DropEventType, DropState, DROP_API_PATH, MessageType } from '@lib/constants';
import type {
    CompleteEvent,
    DropContext,
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
    const contextRef = useRef<DropContext>(initDropContext());

    const [{ value: state }, send] = useMachine(dropMachine);

    const pushLog = (message: string) => logsRef.current.push(message);

    const init = async () => {
        const { initPeer } = await import('@lib/peer');

        const keyPair = await generateKeyPair();

        pushLog('Key pair generated...');
        console.log('Key pair generated');

        const peerId = generateId();
        const peer = await initPeer(peerId);

        pushLog('Peer instance created successfully...');
        console.log(`Peer initialized: ${peerId}`);

        peer.on('connection', (connection) => {
            if (contextRef.current.connection) {
                console.warn('Drop connection already exists!');
                connection.close();
                return;
            }

            connection.on('data', async (msg: BaseMessage) => {
                if (msg.type === MessageType.Handshake) {
                    const { input } = msg as HandshakeMessage;

                    pushLog('Handshake acknowledged, deriving drop key...');

                    const pubKey = await importKey(input, ['deriveKey']);
                    const dropKey = await deriveKey(
                        contextRef.current.keyPair!.privateKey,
                        pubKey,
                    );

                    pushLog('Drop key derived successfully...');

                    contextRef.current.dropKey = dropKey;

                    const event: HandshakeCompleteEvent = {
                        type: DropEventType.HandshakeComplete,
                        dropKey,
                    };

                    send(event);
                } else if (msg.type === MessageType.Verify) {
                    const { integrity } = msg as VerifyMessage;

                    pushLog('Integrity verification request received...');

                    const verified = integrity === contextRef.current.integrity!;

                    pushLog(`Integrity checked ${verified ? 'PASSED' : 'FAILED'}`);

                    const message: ConfirmIntegrityMessage = {
                        type: MessageType.ConfirmVerification,
                        verified,
                    };

                    connection.send(message);

                    pushLog('Integrity confirmation sent, completing drop...');

                    const event: CompleteEvent = {
                        type: DropEventType.Confirm,
                    };

                    send(event);
                } else {
                    console.error(`Invalid message received: ${msg.type}`);
                }
            });

            contextRef.current.connection = connection;

            send({ type: DropEventType.Connect, connection });

            startHandshake();
        });

        const { id, nonce } = await post<InitDropResult, { id: string }>(DROP_API_PATH, {
            id: peer.id,
        });

        pushLog('Session is ready to begin drop...');
        console.log('DROP READY');

        contextRef.current.id = id;
        contextRef.current.peer = peer;
        contextRef.current.keyPair = keyPair;
        contextRef.current.nonce = nonce;

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

        pushLog('Staging & hashing payload for integrity checks...');

        const integrity = await hash(payload);

        contextRef.current.integrity = integrity;
        contextRef.current.message = payload;

        const event: WrapEvent = {
            type: DropEventType.Wrap,
            payload,
            integrity,
        };

        send(event);
    };

    const dropLink = () => {
        const dropId = contextRef.current.id!;
        return typeof window !== 'undefined' ? generateGrabUrl(dropId) : undefined;
    };

    const startHandshake = async () => {
        const { connection, keyPair } = contextRef.current;

        pushLog('Beginning key exchange handshake...');

        const pubKeyAsString = await exportKey(keyPair!.publicKey);

        const message: HandshakeMessage = {
            type: MessageType.Handshake,
            input: pubKeyAsString,
        };

        connection!.send(message);
    };

    const drop = async () => {
        pushLog('Encrypting payload for drop...');

        const payload = await encrypt(
            contextRef.current.dropKey!,
            contextRef.current.nonce!,
            contextRef.current.message,
        );

        pushLog('Payload encrypted, dropping...');

        const message: DropMessage = {
            type: MessageType.Payload,
            payload,
        };

        contextRef.current.connection!.send(message);

        pushLog('Payload dropped, awaiting response...');

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
