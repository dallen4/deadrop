import { assign, grabMachine } from '@lib/machines/grab';
import localForage from 'localforage';
import { useMachine } from '@xstate/react/lib/useMachine';
import { useCrypto } from './use-crypto';
import { AckHandshakeEvent, ExecuteGrabEvent, InitGrabEvent } from 'types/grab';
import { DROP_API_PATH, GrabEventType, MessageType } from '@lib/constants';
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

    const [{ context, value: state }, send] = useMachine(grabMachine, {
        actions: {
            initGrab: (
                context,
                { id, dropperId, peer, keyPair, nonce }: InitGrabEvent,
            ) => {
                assign({ id, dropperId, peer, keyPair, nonce });
            },
            initConnection: async ({ peer, dropperId }) => {
                const connect = () => {
                    const pendingConnection = peer!.connect(dropperId!);

                    return new Promise<typeof pendingConnection>((resolve) => {
                        pendingConnection.on('open', () => {
                            resolve(pendingConnection);
                        });
                    });
                };

                const connection = await connect();

                assign({ connection });
            },
            setGrabKey: (context, { grabKey }: AckHandshakeEvent) => {
                assign({ grabKey });
            },
            sendPublicKey: async ({ connection, keyPair }, event) => {
                logsRef.current.push('Responding to handshake...');

                const pubKeyAsString = await exportKey(keyPair!.publicKey);

                const message: HandshakeMessage = {
                    type: MessageType.Handshake,
                    input: pubKeyAsString,
                };

                connection!.send(message);

                logsRef.current.push('Public key sent, handshake acknowledged...');
            },
            grabMessage: async ({ grabKey, nonce }, { payload }: ExecuteGrabEvent) => {
                logsRef.current.push('Decrypting payload...');

                const message = await decrypt(grabKey!, nonce!, payload);

                logsRef.current.push('Payload decrypted successfully...');

                assign({ message });
            },
            startVerification: async ({ connection, message }) => {
                logsRef.current.push('Generating payload integrity hash...');

                const integrity = await hash(message!);

                const msg: VerifyMessage = {
                    type: MessageType.Verify,
                    integrity,
                };

                connection!.send(msg);
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
            connection.on('data', async (msg: BaseMessage) => {
                if (msg.type === MessageType.Handshake) {
                    const { input } = msg as HandshakeMessage;

                    logsRef.current.push('Handshake request received...');

                    const pubKey = await importKey(input, ['deriveKey']);
                    const grabKey = await deriveKey(keyPair.privateKey, pubKey);

                    logsRef.current.push('Grab key derived successfully...');

                    const event: AckHandshakeEvent = {
                        type: GrabEventType.Handshake,
                        grabKey,
                    };

                    send(event);
                } else if (msg.type === MessageType.Payload) {
                    const { payload } = msg as DropMessage;

                    logsRef.current.push('Drop payload received...');

                    const event: ExecuteGrabEvent = {
                        type: GrabEventType.Grab,
                        payload,
                    };

                    send(event);
                } else if (msg.type === MessageType.ConfirmVerification) {
                    const { verified } = msg as ConfirmIntegrityMessage;

                    send({
                        type: verified ? GrabEventType.Confirm : GrabEventType.Failure,
                    });
                } else {
                    console.error(`Invalid message received: ${msg.type}`);
                }
            });

            send({ type: GrabEventType.Connect, connection });
        });

        const dropId = router.query.id as string;

        const { peerId: dropperId, nonce } = await get<DropDetails>(DROP_API_PATH, {
            id: dropId,
        });

        const event: InitGrabEvent = {
            type: GrabEventType.Init,
            id: dropId,
            dropperId,
            peer,
            keyPair,
            nonce,
        };

        send(event);
    };

    return { init };
};
