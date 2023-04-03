import { grabMachine, initGrabContext } from '@shared/lib/machines/grab';
import { useMachine } from '@xstate/react/lib/useMachine';
import type {
    AckHandshakeEvent,
    GrabContext,
    InitGrabEvent,
} from '@shared/types/grab';
import { GrabEventType, GrabState, MessageType } from '@shared/lib/constants';
import { useRef } from 'react';
import { get } from 'lib/fetch';
import { useRouter } from 'next/router';
import type { DropDetails } from '@shared/types/common';
import type {
    BaseMessage,
    ConfirmIntegrityMessage,
    DropMessage,
    HandshakeMessage,
    VerifyMessage,
} from '@shared/types/messages';
import { DROP_API_PATH } from 'config/paths';
import { generateId } from '@shared/lib/util';
import {
    decryptRaw,
    deriveKey,
    exportKey,
    generateKeyPair,
    hashRaw,
    importKey,
} from '@shared/lib/crypto/operations';
import { decryptFile, hashFile } from 'lib/crypto';

export const useGrab = () => {
    const router = useRouter();

    const logsRef = useRef<Array<string>>([]);
    const contextRef = useRef<GrabContext>(initGrabContext());

    const [{ value: state }, send] = useMachine(grabMachine);

    const pushLog = (message: string) => logsRef.current.push(message);

    const onMessage = async (msg: BaseMessage) => {
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

            pushLog('Acknowledging handshhake, sending public key...');

            sendPublicKey();
        } else if (msg.type === MessageType.Payload) {
            const { payload, mode, meta } = msg as DropMessage;

            pushLog('Drop payload received...');

            logsRef.current.push('Decrypting payload...');

            const { grabKey, nonce } = contextRef.current;

            const decryptedMessage: string | File =
                mode === 'raw'
                    ? await decryptRaw(grabKey!, nonce!, payload)
                    : await decryptFile(grabKey!, nonce!, payload, meta!);

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

            contextRef.current.connection!.send(verificationMessage);

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

        const peerId = generateId();
        const peer = await initPeer(peerId);

        pushLog('Peer instance created successfully...');

        const dropId = router.query.drop as string;

        const resp = await get<DropDetails>(DROP_API_PATH, {
            id: dropId,
        });

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

        connection.on('data', onMessage);

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

    const cleanup = () => {
        if (contextRef.current.connection!.open)
            contextRef.current.connection!.close();

        contextRef.current.peer!.disconnect();
        contextRef.current.peer!.destroy();
        contextRef.current = initGrabContext();
    };

    const getLogs = () => logsRef.current;

    const getMode = () => contextRef.current.mode;

    const getSecret = () => contextRef.current.message;

    return { init, status: state as GrabState, getLogs, getMode, getSecret };
};
