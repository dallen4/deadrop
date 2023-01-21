import { useRef } from 'react';
import { useCrypto } from './use-crypto';
import { useMachine } from '@xstate/react/lib/useMachine';
import { dropMachine, initDropContext } from '@shared/lib/machines/drop';
import { DropEventType, DropState, MessageType } from '@shared/lib/constants';
import type {
    CompleteEvent,
    DropContext,
    HandshakeCompleteEvent,
    InitDropEvent,
} from '@shared/types/drop';
import { generateGrabUrl } from 'lib/util';
import { post } from 'lib/fetch';
import type { InitDropResult } from '@shared/types/common';
import type {
    BaseMessage,
    ConfirmIntegrityMessage,
    DropMessage,
    HandshakeMessage,
    VerifyMessage,
} from '@shared/types/messages';
import type { DataConnection } from 'peerjs';
import { DROP_API_PATH } from 'config/paths';

export const useDrop = () => {
    const {
        generateKeyPair,
        exportKey,
        importKey,
        deriveKey,
        generateId,
        encrypt,
        encryptFile,
        hash,
        hashFile,
    } = useCrypto();

    const logsRef = useRef<Array<string>>([]);
    const contextRef = useRef<DropContext>(initDropContext());

    const [{ value: state }, send] = useMachine(dropMachine);

    console.log('GRAB STATE: ', state);

    const pushLog = (message: string) => logsRef.current.push(message);

    const onMessage = async (msg: BaseMessage) => {
        if (msg.type === MessageType.Handshake) {
            const { input } = msg as HandshakeMessage;

            pushLog('Handshake acknowledged, deriving drop key...');

            const pubKey = await importKey(input, []);
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

            contextRef.current.connection!.send(message);

            pushLog('Integrity confirmation sent, completing drop...');

            const event: CompleteEvent = {
                type: DropEventType.Confirm,
            };

            send(event);

            contextRef.current.connection!.close();
            contextRef.current.peer!.disconnect();
        } else {
            console.error(`Invalid message received: ${msg.type}`);
        }
    };

    const onConnection = (connection: DataConnection) => {
        if (contextRef.current.connection) {
            console.warn('Drop connection already exists!');
            connection.close();
            return;
        }

        contextRef.current.connection = connection;

        connection.on('data', onMessage);

        send({ type: DropEventType.Connect, connection });

        // TODO should replace timeout with an a confirmation message from grabber
        setTimeout(() => startHandshake(), 1000);
    };

    const init = async () => {
        const { initPeer } = await import('lib/peer');

        const keyPair = await generateKeyPair();

        pushLog('Key pair generated...');
        console.log('Key pair generated');

        const peerId = generateId();
        const peer = await initPeer(peerId);

        pushLog('Peer instance created successfully...');
        console.log(`Peer initialized: ${peerId}`);

        peer.on('connection', onConnection);

        const { id, nonce } = await post<InitDropResult, { id: string }>(
            DROP_API_PATH,
            {
                id: peer.id,
            },
        );

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

    const setPayload = async (content: string | File) => {
        pushLog('Staging & hashing payload for integrity checks...');

        const isRaw = typeof content === 'string';

        const { payload, integrity } = isRaw
            ? {
                  payload: {
                      content,
                  },
                  integrity: await hash({ content }),
              }
            : {
                  payload: content,
                  integrity: await hashFile(content),
              };

        contextRef.current.integrity = integrity;
        contextRef.current.message = payload;
        contextRef.current.mode = isRaw ? 'raw' : 'file';

        const event = {
            type: DropEventType.Wrap,
        };

        send(event);
    };

    const dropLink = () => {
        const dropId = contextRef.current.id!;
        return typeof window !== 'undefined'
            ? generateGrabUrl(dropId)
            : undefined;
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

        pushLog('Public key sent...');
    };

    const drop = async () => {
        pushLog('Encrypting payload for drop...');

        const isFile = contextRef.current!.mode === 'file';

        const payload = isFile
            ? await encryptFile(
                  contextRef.current.dropKey!,
                  contextRef.current.nonce!,
                  contextRef.current.message as File,
              )
            : await encrypt(
                  contextRef.current.dropKey!,
                  contextRef.current.nonce!,
                  contextRef.current.message!,
              );

        pushLog('Payload encrypted, dropping...');

        const message: DropMessage = {
            type: MessageType.Payload,
            mode: contextRef.current.mode,
            payload,
            meta: isFile
                ? {
                      name: contextRef.current.message!.name,
                      type: contextRef.current.message!.type,
                  }
                : undefined,
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
