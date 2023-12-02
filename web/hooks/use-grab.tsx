import { grabMachine, initGrabContext } from '@shared/lib/machines/grab';
import { useMachine } from '@xstate/react/lib/useMachine';
import type {
    AckHandshakeEvent,
    GrabContext,
    InitGrabEvent,
} from '@shared/types/grab';
import {
    GrabEventType,
    GrabMessageOrderMap,
    GrabState,
    MessageType,
} from '@shared/lib/constants';
import { useRef } from 'react';
import { get } from '@shared/lib/fetch';
import { useRouter } from 'next/router';
import type { DropDetails } from '@shared/types/common';
import type {
    BaseMessage,
    ConfirmIntegrityMessage,
    DropMessage,
    HandshakeMessage,
    VerifyMessage,
} from '@shared/types/messages';
import { DROP_API_PATH } from '@shared/config/paths';
import {
    decryptRaw,
    deriveKey,
    exportKey,
    generateKeyPair,
    hashRaw,
    importKey,
} from '@shared/lib/crypto/operations';
import { decryptFile, hashFile } from 'lib/crypto';
import { withMessageLock } from '@shared/lib/messages';
import { showNotification } from '@mantine/notifications';
import { IconX } from '@tabler/icons';

export const useGrab = () => {
    const router = useRouter();

    const logsRef = useRef<Array<string>>([]);
    const contextRef = useRef<GrabContext>(initGrabContext());
    const timersRef = useRef(new Map<MessageType, NodeJS.Timeout>());

    const [{ value: state }, send] = useMachine(grabMachine);

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

        const expectedType = GrabMessageOrderMap.get(msg.type)!;

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

            pushLog('Handshake request received...');

            const peerPubKey = await importKey(input, []);

            const privateKey = contextRef.current.keyPair!.privateKey;
            const grabKey = await deriveKey(privateKey, peerPubKey);

            pushLog('Grab key derived successfully...');

            contextRef.current.grabKey = grabKey;

            const event: AckHandshakeEvent = {
                type: GrabEventType.Handshake,
                grabKey,
            };

            send(event);

            pushLog('Acknowledging handshake, sending public key...');

            sendPublicKey();
        } else if (msg.type === MessageType.Payload) {
            const { payload, mode, meta } = msg as DropMessage;

            pushLog('Drop payload received...');

            const { grabKey, nonce } = contextRef.current;

            const isFile = mode === 'file';

            const decryptedMessage: string | File = isFile
                ? await decryptFile(grabKey!, nonce!, payload, meta!)
                : await decryptRaw(grabKey!, nonce!, payload);

            contextRef.current.mode = mode;
            contextRef.current.message = decryptedMessage;

            pushLog('Payload decrypted successfully...');

            const event = {
                type: GrabEventType.Grab,
            };

            send(event);

            pushLog('Generating payload integrity hash...');

            const integrity =
                mode === 'raw'
                    ? await hashRaw(decryptedMessage as string)
                    : await hashFile(decryptedMessage as File);

            pushLog('Integrity hash computed, verifying...');

            const verificationMessage: VerifyMessage = {
                type: MessageType.Verify,
                integrity,
            };

            sendMessage(verificationMessage);

            pushLog('Verification request sent...');

            send({ type: GrabEventType.Verify });
        } else if (msg.type === MessageType.ConfirmVerification) {
            const { verified } = msg as ConfirmIntegrityMessage;

            send({
                type: verified ? GrabEventType.Confirm : GrabEventType.Failure,
            });

            cleanup();
        } else {
            console.error(`Invalid message received: ${msg.type}`);
        }
    };

    const init = async () => {
        const { initPeer } = await import('lib/peer');

        const keyPair = await generateKeyPair();

        pushLog('Key pair generated...');

        const peer = await initPeer();

        pushLog('Peer instance created successfully...');

        const dropId = router.query.drop as string;

        const resp = await get<DropDetails>(DROP_API_PATH, {
            id: dropId,
        });

        if (!resp) {
            pushLog(`Drop instance ${dropId} not found, closing connection...`);
            showNotification({
                message: 'Drop not found, check your link',
                color: 'red',
                icon: <IconX />,
                autoClose: 3000,
            });

            cleanup();
            return;
        }

        const { peerId: dropperId, nonce } = resp;

        contextRef.current.id = dropId;
        contextRef.current.dropperId = dropperId;
        contextRef.current.peer = peer;
        contextRef.current.keyPair = keyPair;
        contextRef.current.nonce = nonce;

        const event: InitGrabEvent = {
            type: GrabEventType.Init,
            id: dropId,
            dropperId,
            peer,
            keyPair,
            nonce,
        };

        send(event);

        const connection = peer!.connect(dropperId);

        connection.on('error', console.error);
        connection.on('open', () => {
            pushLog('Drop connection successful...');

            send({ type: GrabEventType.Connect });
        });

        const handlerWithLock = withMessageLock(onMessage, pushLog);
        connection.on('data', handlerWithLock);

        contextRef.current.connection = connection;
    };

    const sendPublicKey = async () => {
        const { connection, keyPair } = contextRef.current;

        pushLog('Beginning key exchange handshake...');

        const pubKeyAsString = await exportKey(keyPair!.publicKey);

        const message: HandshakeMessage = {
            type: MessageType.Handshake,
            input: pubKeyAsString,
        };

        connection!.send(message);
    };

    const cleanup = async () => {
        const { removeOnUnloadListener } = await import('shared/lib/peer');

        if (contextRef.current.connection?.open)
            contextRef.current.connection!.close();

        contextRef.current.peer?.disconnect();
        contextRef.current.peer?.destroy();

        removeOnUnloadListener();

        contextRef.current = initGrabContext();
    };

    const getLogs = () => logsRef.current;

    const getMode = () => contextRef.current.mode;

    const getSecret = () => contextRef.current.message;


    return {
        init,
        status: state as GrabState,
        getLogs,
        getMode,
        getSecret,
    };
};
