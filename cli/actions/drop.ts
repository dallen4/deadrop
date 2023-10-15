import type { InitDropResult, PayloadMode } from '@shared/types/common';
import inquirer from 'inquirer';
import { loader } from 'lib/loader';
import { displayWelcomeMessage, logError, logInfo } from 'lib/log';
import { initPeer } from 'lib/peer';
import { DataConnection } from 'peerjs';
import { dropMachine, initDropContext } from '@shared/lib/machines/drop';
import {
    DropEventType,
    DropMessageOrderMap,
    MessageType,
} from '@shared/lib/constants';
import {
    deriveKey,
    encryptRaw,
    exportKey,
    generateKeyPair,
    hashRaw,
    importKey,
} from '@shared/lib/crypto/operations';
import { deleteReq, post } from '@shared/lib/fetch';
import {
    AnyDropEvent,
    CompleteEvent,
    HandshakeCompleteEvent,
    InitDropEvent,
} from '@shared/types/drop';
import { DROP_API_PATH } from '@shared/config/paths';
import {
    BaseMessage,
    ConfirmIntegrityMessage,
    DropMessage,
    HandshakeMessage,
    VerifyMessage,
} from '@shared/types/messages';
import { encryptFile, hashFile } from 'lib/crypto';
import { withMessageLock } from '@shared/lib/messages';
import { generateGrabUrl } from 'lib/util';
import chalk from 'chalk';
import { cleanupSession } from 'lib/session';
import QRCode from 'qrcode';

type DropOptions = {
    input?: string;
    file?: boolean;
};

export const drop = async (input: string | undefined, options: DropOptions) => {
    const ctx = initDropContext();
    const timers = new Map<MessageType, NodeJS.Timeout>();

    let currState = dropMachine.initialState;

    const sendEvent = (event: AnyDropEvent) => {
        currState = dropMachine.transition(currState, event);
        return currState;
    };

    ctx.message = input || options.input || null;
    ctx.mode = options.file ? 'file' : 'raw';

    displayWelcomeMessage();

    if (!ctx.message) {
        logInfo('No input provided...');

        const answer = await inquirer.prompt([
            {
                name: 'input',
                type: 'input',
                message: 'input here: ',
            },
        ]);

        ctx.message = answer.input;
    }

    const stagePayload = async (content: string, mode: PayloadMode) => {
        logInfo('Staging & hashing payload for integrity checks...');

        const isRaw = mode === 'raw';

        const integrity = isRaw
            ? await hashRaw(content)
            : await hashFile(content);

        ctx.integrity = integrity;
        ctx.message = content;
        ctx.mode = mode;

        const event = {
            type: DropEventType.Wrap,
        };

        sendEvent(event);
    };

    await stagePayload(ctx.message as string, ctx.mode);

    ctx.keyPair = await generateKeyPair();

    logInfo('Key pair generated...');

    loader.start('Initializing peer...');

    ctx.peer = await initPeer();

    loader.stop();

    logInfo('Peer successfully connected!');

    const startHandshake = async () => {
        const { connection, keyPair } = ctx;

        logInfo('Beginning key exchange handshake...');

        const pubKeyAsString = await exportKey(keyPair!.publicKey);

        const message: HandshakeMessage = {
            type: MessageType.Handshake,
            input: pubKeyAsString,
        };

        connection!.send(message);

        logInfo('Public key sent...');
    };

    const drop = async () => {
        logInfo('Encrypting payload for drop...');

        const isFile = ctx!.mode === 'file';

        const payload = isFile
            ? await encryptFile(
                  ctx.dropKey!,
                  ctx.nonce!,
                  ctx.message! as string,
              )
            : await encryptRaw(
                  ctx.dropKey!,
                  ctx.nonce!,
                  ctx.message! as string,
              );

        logInfo('Payload encrypted, dropping...');

        const message: DropMessage = {
            type: MessageType.Payload,
            mode: ctx.mode,
            payload,
            meta: isFile
                ? {
                      name: (ctx.message! as File).name,
                      type: (ctx.message! as File).type,
                  }
                : undefined,
        };

        sendMessage(message);

        loader.start('Payload dropped, awaiting response...');

        sendEvent({ type: DropEventType.Drop });
    };

    const cleanup = async () => {
        const dropId = ctx.id!;

        await deleteReq(process.env.DEADDROP_API_URL! + DROP_API_PATH, {
            id: dropId,
        }).catch((err) =>
            console.error(
                `Failed to clear session data from cache (drop: ${dropId})`,
                err,
            ),
        );

        logInfo(chalk.bold('Drop completed!'));

        cleanupSession(ctx);
    };

    const clearTimer = (msgType: MessageType) => {
        const timerId = timers.get(msgType);

        if (timerId) {
            clearTimeout(timerId);
            timers.delete(msgType);
        }
    };

    const sendMessage = async (msg: BaseMessage, retryCount: number = 0) => {
        if (!ctx.connection) return;

        const expectedType = DropMessageOrderMap.get(msg.type)!;

        clearTimer(expectedType);

        if (retryCount >= 3) {
            logError(`Attempt limit exceeded for type: ${msg.type}`);
            return;
        }

        ctx.connection.send(msg);

        const timer = setTimeout(() => sendMessage(msg, retryCount + 1), 1000);
        timers.set(expectedType, timer);
    };

    const onMessage = async (msg: BaseMessage) => {
        clearTimer(msg.type);

        if (msg.type === MessageType.Handshake) {
            const { input } = msg as HandshakeMessage;

            logInfo('Handshake acknowledged, deriving drop key...');

            const pubKey = await importKey(input, []);
            const dropKey = await deriveKey(ctx.keyPair!.privateKey, pubKey);

            logInfo('Drop key derived successfully...');

            ctx.dropKey = dropKey;

            const event: HandshakeCompleteEvent = {
                type: DropEventType.HandshakeComplete,
                dropKey,
            };

            sendEvent(event);

            await drop();
        } else if (msg.type === MessageType.Verify) {
            loader.stop();

            logInfo('Integrity verification request received...');

            const { integrity } = msg as VerifyMessage;

            const verified = integrity === ctx.integrity!;

            logInfo(
                `Integrity checked ${chalk.bold(
                    verified ? 'PASSED' : 'FAILED',
                )}`,
            );

            const message: ConfirmIntegrityMessage = {
                type: MessageType.ConfirmVerification,
                verified,
            };

            sendMessage(message);

            logInfo('Integrity confirmation sent, completing drop...');

            const event: CompleteEvent = {
                type: DropEventType.Confirm,
            };

            sendEvent(event);

            setTimeout(() => cleanup(), 1000);
        } else {
            console.error(`Invalid message received: ${msg.type}`);
        }
    };

    const onConnection = (newConnection: DataConnection) => {
        if (ctx.connection) {
            logError('Drop connection already exists!');
            newConnection.close();
            return;
        }

        ctx.connection = newConnection;

        loader.stop();

        logInfo('Grab request received!');

        const handlerWithLock = withMessageLock(onMessage, logInfo);
        ctx.connection.on('data', (data) =>
            handlerWithLock(data as BaseMessage),
        );

        sendEvent({
            type: DropEventType.Connect,
            connection: ctx.connection,
        });

        // TODO should replace timeout with an a confirmation message from grabber
        setTimeout(() => startHandshake(), 1000);
    };

    ctx.peer.on('connection', onConnection);

    const { id, nonce } = await post<InitDropResult, { id: string }>(
        process.env.DEADDROP_API_URL! + DROP_API_PATH,
        {
            id: ctx.peer.id,
        },
    );

    ctx.id = id;
    ctx.nonce = nonce;

    const grabLink = generateGrabUrl(ctx.id);

    logInfo(`Use grab link: ${chalk.bold(grabLink)}`);

    const grabQR = await QRCode.toString(grabLink, {
        type: 'terminal',
        small: true,
    });

    logInfo(`Or scan the QR code:\n${grabQR}`);

    loader.start('Waiting for grab request...');

    const initEvent: InitDropEvent = {
        type: DropEventType.Init,
        id,
        peer: ctx.peer,
        keyPair: ctx.keyPair,
        nonce,
    };

    sendEvent(initEvent);
};
