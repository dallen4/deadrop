import type {
    CompleteEvent,
    DropContext,
    HandshakeCompleteEvent,
    InitDropEvent,
} from '@shared/types/drop';
import type { InitDropResult } from '@shared/types/common';
import type {
    BaseMessage,
    ConfirmIntegrityMessage,
    DropMessage,
    HandshakeMessage,
    VerifyMessage,
} from '@shared/types/messages';
import type { DataConnection } from 'peerjs';
import { useRef } from 'react';
import { useMachine } from '@xstate/react/lib/useMachine';
import { dropMachine, initDropContext } from '@shared/lib/machines/drop';
import {
    DropEventType,
    DropMessageOrderMap,
    DropState,
    MessageType,
} from '@shared/lib/constants';
import { generateGrabUrl } from 'lib/util';
import { deleteReq, post } from '@shared/lib/fetch';
import { DROP_API_PATH } from '@shared/config/paths';
import {
    deriveKey,
    encryptRaw,
    exportKey,
    generateKeyPair,
    hashRaw,
    importKey,
} from '@shared/lib/crypto/operations';
import { encryptFile, hashFile } from 'lib/crypto';
import { showNotification } from '@mantine/notifications';
import { IconX } from '@tabler/icons';
import { withMessageLock } from 'lib/messages';

export const useDrop = () => {
    const logsRef = useRef<Array<string>>([]);
    const contextRef = useRef<DropContext>(initDropContext());
    const timersRef = useRef(new Map<MessageType, NodeJS.Timeout>());

    const [{ value: state }, send] = useMachine(dropMachine);

    const pushLog = (message: string) => logsRef.current.push(message);

    const clearTimer = (msgType: MessageType) => {
        const timerId = timersRef.current.get(msgType);

        if (timerId) {
            clearTimeout(timerId);
            timersRef.current.delete(msgType);
        }
    };

    const sendMessage = async (msg: BaseMessage, retryCount: number = 0) => {
        if (!contextRef.current.connection) return;

        const expectedType = DropMessageOrderMap.get(msg.type)!;

        clearTimer(expectedType);

        if (retryCount >= 3) {
            showNotification({
                message:
                    'Connection may be unstable, please try your drop again',
                color: 'red',
                icon: <IconX />,
                autoClose: 4500,
            });
            console.error(`Attempt limit exceeded for type: ${msg.type}`);
            return;
        }

        contextRef.current.connection.send(msg);

        const timer = setTimeout(() => sendMessage(msg, retryCount + 1), 1000);
        timersRef.current.set(expectedType, timer);
    };

    const onMessage = async (msg: BaseMessage) => {
        clearTimer(msg.type);

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

            sendMessage(message);

            pushLog('Integrity confirmation sent, completing drop...');

            const event: CompleteEvent = {
                type: DropEventType.Confirm,
            };

            send(event);

            setTimeout(() => cleanup(), 1000);
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

        const handlerWithLock = withMessageLock(onMessage, pushLog);
        connection.on('data', handlerWithLock);

        send({ type: DropEventType.Connect, connection });

        // TODO should replace timeout with an a confirmation message from grabber
        setTimeout(() => startHandshake(), 1000);
    };

    const init = async () => {
        const { initPeer } = await import('lib/peer');

        const keyPair = await generateKeyPair();

        pushLog('Key pair generated...');

        const peer = await initPeer();

        pushLog('Peer instance created successfully...');

        peer.on('connection', onConnection);

        try {
            const { id, nonce } = await post<InitDropResult, { id: string }>(
                DROP_API_PATH,
                {
                    id: peer.id,
                },
            );

            pushLog('Session is ready to begin drop...');

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
        } catch (err) {
            console.error(err);
            showNotification({
                message: (err as Error).message,
                color: 'red',
                icon: <IconX />,
                autoClose: 2000,
            });
        }
    };

    const setPayload = async (content: string | File) => {
        pushLog('Staging & hashing payload for integrity checks...');

        const isRaw = typeof content === 'string';

        const { payload, integrity } = isRaw
            ? {
                  payload: content,
                  integrity: await hashRaw(content),
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
            : await encryptRaw(
                  contextRef.current.dropKey!,
                  contextRef.current.nonce!,
                  contextRef.current.message! as string,
              );

        pushLog('Payload encrypted, dropping...');

        const message: DropMessage = {
            type: MessageType.Payload,
            mode: contextRef.current.mode,
            payload,
            meta: isFile
                ? {
                      name: (contextRef.current.message! as File).name,
                      type: (contextRef.current.message! as File).type,
                  }
                : undefined,
        };

        sendMessage(message);

        pushLog('Payload dropped, awaiting response...');

        send({ type: DropEventType.Drop });
    };

    const cleanup = async () => {
        const { removeOnUnloadListener } = await import('shared/lib/peer');

        contextRef.current.connection!.close();
        contextRef.current.peer!.disconnect();
        contextRef.current.peer!.destroy();

        const dropId = contextRef.current.id!;

        deleteReq(DROP_API_PATH, { id: dropId }).catch((err) =>
            console.error(
                `Failed to clear session data from cache (drop: ${dropId})`,
                err,
            ),
        );

        removeOnUnloadListener();

        contextRef.current = initDropContext();
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
