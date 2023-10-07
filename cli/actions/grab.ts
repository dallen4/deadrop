import {
    decryptRaw,
    deriveKey,
    exportKey,
    generateKeyPair,
    hashRaw,
    importKey,
} from '@shared/lib/crypto/operations';
import { get } from '@shared/lib/fetch';
import { grabMachine, initGrabContext } from '@shared/lib/machines/grab';
import { DropDetails } from '@shared/types/common';
import { loader } from 'lib/loader';
import { displayWelcomeMessage, logError, logInfo } from 'lib/log';
import { initPeer } from 'lib/peer';
import { DROP_API_PATH } from '@shared/config/paths';
import {
    AckHandshakeEvent,
    AnyGrabEvent,
    InitGrabEvent,
} from '@shared/types/grab';
import { cleanup } from 'lib/session';
import {
    GrabEventType,
    GrabMessageOrderMap,
    MessageType,
} from '@shared/lib/constants';
import { withMessageLock } from '@shared/lib/messages';
import {
    BaseMessage,
    ConfirmIntegrityMessage,
    DropMessage,
    HandshakeMessage,
    VerifyMessage,
} from '@shared/types/messages';
import { decryptFile, hashFile } from 'lib/crypto';

export const grab = async (id: string) => {
    const ctx = initGrabContext();
    const timers = new Map<MessageType, NodeJS.Timeout>();

    let currState = grabMachine.initialState;

    const sendEvent = (event: AnyGrabEvent) => {
        currState = grabMachine.transition(currState, event);
        return currState;
    };

    ctx.id = id;

    displayWelcomeMessage();

    ctx.keyPair = await generateKeyPair();

    logInfo('Key pair generated...');

    loader.start('Initializing peer...');

    ctx.peer = await initPeer();

    loader.stop();

    logInfo('Peer successfully connected!');

    logInfo('Fetching drop details...');

    try {
        const details = await get<DropDetails>(
            process.env.DEADDROP_API_URL! + DROP_API_PATH,
            {
                id: ctx.id,
            },
        );

        if (!details) {
            logError(
                `Drop instance ${ctx.id} not found, closing connection...`,
            );
            cleanup(ctx);

            return;
        }

        logInfo(`Drop ${ctx.id} found!`);
        console.log(details);
        ctx.dropperId = details.peerId;
        ctx.nonce = details.nonce;
    } catch (err) {
        console.error(err);

        return;
    }

    const event: InitGrabEvent = {
        type: GrabEventType.Init,
        id: ctx.id,
        dropperId: ctx.dropperId,
        peer: ctx.peer,
        keyPair: ctx.keyPair,
        nonce: ctx.nonce,
    };

    sendEvent(event);

    loader.start(`Attempting to connect to dropper...`);

    // TODO add custom messages per error type
    ctx.peer!.on('error', (err) => {
        if (err.type === 'peer-unavailable')
            logError('Peer not found! Ending session!');
        else console.error(err);
    });

    ctx.connection = ctx.peer!.connect(ctx.dropperId);

    // TODO add custom messages per error type
    ctx.connection!.on('error', console.error);

    ctx.connection!.on('open', () => {
        loader.stop();

        logInfo('Drop connection successful...');

        sendEvent({ type: GrabEventType.Connect });
    });

    const clearTimer = (msgType: MessageType) => {
        const timerId = timers.get(msgType);

        if (timerId) {
            clearTimeout(timerId);
            timers.delete(msgType);
        }
    };

    const sendPublicKey = async () => {
        const { connection, keyPair } = ctx;

        logInfo('Beginning key exchange handshake...');

        const pubKeyAsString = await exportKey(keyPair!.publicKey);

        const message: HandshakeMessage = {
            type: MessageType.Handshake,
            input: pubKeyAsString,
        };

        connection!.send(message);
    };

    const sendMessage = async (msg: BaseMessage, retryCount: number = 0) => {
        if (!ctx.connection) return;

        const expectedType = GrabMessageOrderMap.get(msg.type)!;

        clearTimer(expectedType);

        if (retryCount >= 3) {
            logError(`Attempt limit exceeded for type: ${msg.type}`);
            return;
        }

        ctx.connection.send(msg);

        const timer = setTimeout(() => sendMessage(msg, retryCount + 1), 1000);
        timers.set(expectedType, timer);
    };

    const onMessageHandler = async (msg: BaseMessage) => {
        clearTimer(msg.type);

        if (msg.type === MessageType.Handshake) {
            const { input } = msg as HandshakeMessage;

            logInfo('Handshake request received...');

            const peerPubKey = await importKey(input, []);

            const privateKey = ctx.keyPair!.privateKey;
            const grabKey = await deriveKey(privateKey, peerPubKey);

            logInfo('Grab key derived successfully...');

            ctx.grabKey = grabKey;

            const event: AckHandshakeEvent = {
                type: GrabEventType.Handshake,
                grabKey,
            };

            sendEvent(event);

            logInfo('Acknowledging handshake, sending public key...');

            sendPublicKey();
        } else if (msg.type === MessageType.Payload) {
            const { payload, mode, meta } = msg as DropMessage;

            logInfo('Drop payload received, decrypting...');

            const { grabKey, nonce } = ctx;

            const decryptedMessage: string | File =
                mode === 'raw'
                    ? await decryptRaw(grabKey!, nonce!, payload)
                    : await decryptFile(grabKey!, nonce!, payload, meta!);

            ctx.mode = mode;
            ctx.message = decryptedMessage;

            logInfo('Payload decrypted successfully...');

            const event = {
                type: GrabEventType.Grab,
            };

            sendEvent(event);

            logInfo('Generating payload integrity hash...');

            const integrity =
                mode === 'raw'
                    ? await hashRaw(decryptedMessage as string)
                    : await hashFile(decryptedMessage as string);

            logInfo('Integrity hash computed, verifying...');

            const verificationMessage: VerifyMessage = {
                type: MessageType.Verify,
                integrity,
            };

            ctx.connection!.send(verificationMessage);

            logInfo('Verification request sent...');

            sendEvent({ type: GrabEventType.Verify });
        } else if (msg.type === MessageType.ConfirmVerification) {
            const { verified } = msg as ConfirmIntegrityMessage;

            if (verified) logInfo(`Message validated!\nSecret: ${ctx.message}`);
            else logError('Validation failed!');

            sendEvent({
                type: verified ? GrabEventType.Confirm : GrabEventType.Failure,
            });

            cleanup(ctx);
        } else {
            console.error(`Invalid message received: ${msg.type}`);
        }
    };

    const handlerWithLock = withMessageLock(onMessageHandler, logInfo);
    ctx.connection!.on('data', (data) => handlerWithLock(data as BaseMessage));
};
