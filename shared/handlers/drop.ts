import { InitDropResult, PayloadMode } from '../types/common';
import {
  DropEventType,
  DropMessageOrderMap,
  MessageType,
} from '../lib/constants';
import {
  deriveKey,
  encryptRaw,
  exportKey,
  generateKeyPair,
  hashRaw,
  importKey,
} from '../lib/crypto/operations';
import {
  CompleteEvent,
  DropHandlerInputs,
  HandshakeCompleteEvent,
  InitDropEvent,
} from '../types/drop';
import {
  BaseMessage,
  ConfirmIntegrityMessage,
  DropMessage,
  HandshakeMessage,
  VerifyMessage,
} from '../types/messages';
import { DataConnection } from 'peerjs';
import { withMessageLock } from '../lib/messages';
import { deleteReq, post } from '../lib/fetch';
import { DROP_API_PATH } from '../config/paths';

export const createDropHandlers = <
  FileType extends string | File = string,
>({
  ctx,
  sendEvent,
  logger,
  file,
  onRetryExceeded,
  cleanupSession,
  apiUri = '',
  initPeer,
}: DropHandlerInputs<FileType>) => {
  const dropApiUrl = apiUri + DROP_API_PATH;
  const timers = new Map<MessageType, NodeJS.Timeout>();

  const clearTimer = (msgType: MessageType) => {
    const timerId = timers.get(msgType);

    if (timerId) {
      clearTimeout(timerId);
      timers.delete(msgType);
    }
  };

  const cleanup = async () => {
    const dropId = ctx.id!;

    await deleteReq(dropApiUrl, {
      id: dropId,
    }).catch((err) =>
      console.error(
        `Failed to clear session data from cache (drop: ${dropId})`,
        err,
      ),
    );

    // logger.info(chalk.bold('Drop completed!'));

    cleanupSession(ctx);
  };

  const sendMessage = async (
    msg: BaseMessage,
    retryCount: number = 0,
  ) => {
    if (!ctx.connection) return;

    const expectedType = DropMessageOrderMap.get(msg.type)!;

    clearTimer(expectedType);

    if (retryCount >= 3) {
      logger.error(`Attempt limit exceeded for type: ${msg.type}`);
      onRetryExceeded && onRetryExceeded(msg.type);
      return;
    }

    ctx.connection.send(msg);

    if (msg.type !== MessageType.ConfirmVerification) {
      const timer = setTimeout(
        () => sendMessage(msg, retryCount + 1),
        1000,
      );
      timers.set(expectedType, timer);
    }
  };

  const startHandshake = async () => {
    const { keyPair } = ctx;

    logger.info('Beginning key exchange handshake...');

    const pubKeyAsString = await exportKey(keyPair!.publicKey);

    const message: HandshakeMessage = {
      type: MessageType.Handshake,
      input: pubKeyAsString,
    };

    sendMessage(message);

    logger.info('Public key sent...');
  };

  const stagePayload = async (
    content: FileType | string,
    mode: PayloadMode,
  ) => {
    logger.info('Staging & hashing payload for integrity checks...');

    const isRaw = mode === 'raw';

    const integrity = isRaw
      ? await hashRaw(content as string)
      : await file.hash(content as FileType);

    ctx.integrity = integrity;
    ctx.message = content;
    ctx.mode = mode;

    const event = {
      type: DropEventType.Wrap,
    };

    sendEvent(event);
  };

  const drop = async () => {
    logger.info('Encrypting payload for drop...');

    const isFile = ctx!.mode === 'file';

    const payload = isFile
      ? await file.encrypt(
          ctx.dropKey!,
          ctx.nonce!,
          ctx.message! as FileType,
        )
      : await encryptRaw(
          ctx.dropKey!,
          ctx.nonce!,
          ctx.message! as string,
        );

    logger.info('Payload encrypted, dropping...');

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

    // loader.start('Payload dropped, awaiting response...');

    sendEvent({ type: DropEventType.Drop });
  };

  const onMessage = async (msg: BaseMessage) => {
    clearTimer(msg.type);

    if (msg.type === MessageType.Handshake) {
      const { input } = msg as HandshakeMessage;

      logger.info('Handshake acknowledged, deriving drop key...');

      const pubKey = await importKey(input, []);
      const dropKey = await deriveKey(
        ctx.keyPair!.privateKey,
        pubKey,
      );

      logger.info('Drop key derived successfully...');

      ctx.dropKey = dropKey;

      const event: HandshakeCompleteEvent = {
        type: DropEventType.HandshakeComplete,
        dropKey,
      };

      sendEvent(event);

      await drop();
    } else if (msg.type === MessageType.Verify) {
      // loader.stop();

      logger.info('Integrity verification request received...');

      const { integrity } = msg as VerifyMessage;

      const verified = integrity === ctx.integrity!;

      // logger.info(
      //     `Integrity checked ${chalk.bold(
      //         verified ? 'PASSED' : 'FAILED',
      //     )}`,
      // );

      const message: ConfirmIntegrityMessage = {
        type: MessageType.ConfirmVerification,
        verified,
      };

      sendMessage(message);

      logger.info('Integrity confirmation sent, completing drop...');

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
      logger.error('Drop connection already exists!');
      newConnection.close();
      return;
    }

    ctx.connection = newConnection;

    // loader.stop();

    logger.info('Grab request received!');

    const handlerWithLock = withMessageLock(onMessage, logger.info);
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

  const init = async () => {
    ctx.keyPair = await generateKeyPair();

    ctx.peer = await initPeer();

    ctx.peer.on('connection', onConnection);

    const { id, nonce } = await post<InitDropResult, { id: string }>(
      dropApiUrl,
      {
        id: ctx.peer.id,
      },
    );

    ctx.id = id;
    ctx.nonce = nonce;

    const initEvent: InitDropEvent = {
      type: DropEventType.Init,
      id: ctx.id!,
      peer: ctx.peer!,
      keyPair: ctx.keyPair!,
      nonce: ctx.nonce!,
    };

    sendEvent(initEvent);
  };

  return { init, stagePayload, startHandshake, drop, cleanup };
};
