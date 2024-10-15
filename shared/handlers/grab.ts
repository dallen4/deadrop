import {
  BaseMessage,
  ConfirmIntegrityMessage,
  DropMessage,
  HandshakeMessage,
  VerifyMessage,
} from '../types/messages';
import {
  AckHandshakeEvent,
  GrabHandlerInputs,
  InitGrabEvent,
} from '../types/grab';
import {
  GrabEventType,
  GrabMessageOrderMap,
  MessageType,
} from '../lib/constants';
import { DROP_API_PATH } from '../config/paths';
import {
  decryptRaw,
  deriveKey,
  exportKey,
  generateKeyPair,
  hashRaw,
  importKey,
} from '../lib/crypto/operations';
import { get } from '../lib/fetch';
import { DropDetails } from '../types/common';
import { withMessageLock } from '../lib/messages';

export const createGrabHandlers = <
  FileType extends string | File = string,
>({
  ctx,
  sendEvent,
  logger,
  file,
  initPeer,
  cleanupSession,
  apiUri = '',
  onRetryExceeded,
}: GrabHandlerInputs<FileType>) => {
  const dropApiUrl = apiUri + DROP_API_PATH;
  const timers = new Map<MessageType, NodeJS.Timeout>();

  const clearTimer = (msgType: MessageType) => {
    const timerId = timers.get(msgType);

    if (timerId) {
      clearTimeout(timerId);
      timers.delete(msgType);
    }
  };

  const sendMessage = async (
    msg: BaseMessage,
    retryCount: number = 0,
  ) => {
    if (!ctx.connection) return;

    const expectedType = GrabMessageOrderMap.get(msg.type)!;

    clearTimer(expectedType);

    if (retryCount >= 3) {
      logger.error(`Attempt limit exceeded for type: ${msg.type}`);
      onRetryExceeded && onRetryExceeded(msg.type);
      return;
    }

    ctx.connection.send(msg);

    const timer = setTimeout(
      () => sendMessage(msg, retryCount + 1),
      1000,
    );
    timers.set(expectedType, timer);
  };

  const sendPublicKey = async () => {
    const { keyPair } = ctx;

    logger.info('Beginning key exchange handshake...');

    const pubKeyAsString = await exportKey(keyPair!.publicKey);

    const message: HandshakeMessage = {
      type: MessageType.Handshake,
      input: pubKeyAsString,
    };

    sendMessage(message);
  };

  const onMessage = async (msg: BaseMessage) => {
    clearTimer(msg.type);

    if (msg.type === MessageType.Handshake) {
      const { input } = msg as HandshakeMessage;

      logger.info('Handshake request received...');

      const peerPubKey = await importKey(input, []);

      const privateKey = ctx.keyPair!.privateKey;
      const grabKey = await deriveKey(privateKey, peerPubKey);

      logger.info('Grab key derived successfully...');

      ctx.grabKey = grabKey;

      const event: AckHandshakeEvent = {
        type: GrabEventType.Handshake,
        grabKey,
      };

      sendEvent(event);

      logger.info('Acknowledging handshake, sending public key...');

      sendPublicKey();
    } else if (msg.type === MessageType.Payload) {
      const { payload, mode, meta } = msg as DropMessage;

      logger.info('Drop payload received, decrypting...');

      const { grabKey, nonce } = ctx;

      const decryptedMessage: string | FileType =
        mode === 'raw'
          ? await decryptRaw(grabKey!, nonce!, payload)
          : await file.decrypt(grabKey!, nonce!, payload, meta!);

      ctx.mode = mode;
      ctx.message = decryptedMessage;

      logger.info('Payload decrypted successfully...');

      const event = {
        type: GrabEventType.Grab,
      };

      sendEvent(event);

      logger.info('Generating payload integrity hash...');

      const integrity =
        mode === 'raw'
          ? await hashRaw(decryptedMessage as string)
          : await file.hash(decryptedMessage as FileType);

      logger.info('Integrity hash computed, verifying...');

      const verificationMessage: VerifyMessage = {
        type: MessageType.Verify,
        integrity,
      };

      ctx.connection!.send(verificationMessage);

      logger.info('Verification request sent...');

      sendEvent({ type: GrabEventType.Verify });
    } else if (msg.type === MessageType.ConfirmVerification) {
      const { verified } = msg as ConfirmIntegrityMessage;

      if (verified)
        logger.info(`Message validated!\n\nSecret: ${ctx.message}`);
      else logger.error('Validation failed!');

      sendEvent({
        type: verified
          ? GrabEventType.Confirm
          : GrabEventType.Failure,
      });

      cleanupSession(ctx);
    } else {
      console.error(`Invalid message received: ${msg.type}`);
    }
  };

  const init = async () => {
    ctx.keyPair = await generateKeyPair();

    ctx.peer = await initPeer();

    // TODO add custom messages per error type
    ctx.peer!.on('error', (err) => {
      if (err.type === 'peer-unavailable')
        logger.error('Peer not found! Ending session!');
      else console.error(err);
    });

    logger.info('Key pair generated & peer successfully connected!');

    logger.info('Fetching drop details...');

    try {
      const details = await get<DropDetails>(dropApiUrl, {
        id: ctx.id,
      });

      if (!details) {
        logger.error(
          `Drop instance ${ctx.id} not found, closing connection...`,
        );

        throw new Error('Invalid drop ID provided');
      }

      logger.info(`Drop ${ctx.id} found!`);

      ctx.dropperId = details.peerId;
      ctx.nonce = details.nonce;
    } catch (err) {
      logger.error(`Something went wrong finding drop ${ctx.id}...`);

      console.error(err);

      return cleanupSession(ctx);
    }

    const event: InitGrabEvent = {
      type: GrabEventType.Init,
      id: ctx.id!,
      dropperId: ctx.dropperId,
      peer: ctx.peer!,
      keyPair: ctx.keyPair,
      nonce: ctx.nonce,
    };

    sendEvent(event);

    ctx.connection = ctx.peer!.connect(ctx.dropperId);

    // TODO add custom messages per error type
    ctx.connection!.on('error', console.error);

    ctx.connection!.on('open', () => {
      // loader.stop();

      const handlerWithLock = withMessageLock(onMessage, logger.info);
      ctx.connection!.on('data', (data) =>
        handlerWithLock(data as BaseMessage),
      );

      logger.info('Drop connection successful...');

      sendEvent({ type: GrabEventType.Connect });
    });
  };

  return { init };
};
