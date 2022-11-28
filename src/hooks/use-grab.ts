import { grabMachine, initGrabContext } from '@lib/machines/grab';
import { useMachine } from '@xstate/react/lib/useMachine';
import { useCrypto } from './use-crypto';
import {
    AckHandshakeEvent,
    ExecuteGrabEvent,
    GrabContext,
    InitGrabEvent,
} from 'types/grab';
import { DROP_API_PATH, GrabEventType, GrabState, MessageType } from '@lib/constants';
import { useRef } from 'react';
import { get } from '@lib/fetch';
import { useRouter } from 'next/router';
import { DropDetails } from 'types/common';
import {
    BaseMessage,
    ConfirmIntegrityMessage,
    DropMessage,
    HandshakeMessage,
    VerifyMessage,
} from 'types/messages';

export const useGrab = () => {
    const router = useRouter();
    const {
        generateKeyPair,
        importKey,
        deriveKey,
        exportKey,
        generateId,
        decrypt,
        hash,
    } = useCrypto();

    const logsRef = useRef<Array<string>>([]);
    const contextRef = useRef<GrabContext>(initGrabContext());

    const [{ value: state }, send] = useMachine(grabMachine);

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
            console.log('Connection established');

            send({ type: GrabEventType.Connect });
        });

        connection.on('data', async (msg: BaseMessage) => {
            console.log('MESSAGE RECEIVED:', msg);
            if (msg.type === MessageType.Handshake) {
                const { input } = msg as HandshakeMessage;

                pushLog('Handshake request received...');

                const pubKey = await importKey(input, []);
                const grabKey = await deriveKey(keyPair.privateKey, pubKey);

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
                const { payload } = msg as DropMessage;

                pushLog('Drop payload received...');

                logsRef.current.push('Decrypting payload...');

                const { grabKey, nonce } = contextRef.current;

                const decryptedMessage = await decrypt(grabKey!, nonce!, payload);

                contextRef.current.message = decryptedMessage;

                pushLog('Payload decrypted successfully...');

                const event: ExecuteGrabEvent = {
                    type: GrabEventType.Grab,
                    payload,
                };

                send(event);

                pushLog('Generating payload integrity hash...');

                const integrity = await hash(decryptedMessage!);

                pushLog('Integrity hash computed, verifying...');

                const verificationMessage: VerifyMessage = {
                    type: MessageType.Verify,
                    integrity,
                };

                connection!.send(verificationMessage);

                pushLog('Verification request sent...');

                send({ type: GrabEventType.Verify });
            } else if (msg.type === MessageType.ConfirmVerification) {
                const { verified } = msg as ConfirmIntegrityMessage;

                send({
                    type: verified ? GrabEventType.Confirm : GrabEventType.Failure,
                });
            } else {
                console.error(`Invalid message received: ${msg.type}`);
            }
        });

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

    const getLogs = () => logsRef.current;

    const getSecret = () => contextRef.current.message;

    return { init, status: state as GrabState, getLogs, getSecret };
};
