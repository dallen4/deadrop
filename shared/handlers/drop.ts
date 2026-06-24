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
  DropHandlerInputs,
  GrabberConnectedEvent,
  GrabberFailedEvent,
  GrabberProgressEvent,
  GrabberRecord,
  GrabberStatus,
  InitDropEvent,
  WrapEvent,
} from '../types/drop';
import { reachedCap } from '../lib/machines/drop';
import {
  BaseMessage,
  ConfirmIntegrityMessage,
  DropMessage,
  HandshakeMessage,
  VerifyMessage,
} from '../types/messages';
import { DataConnection } from 'peerjs';
import { withGrabberMessageLock } from '../lib/messages';
import { createClient } from '../client';

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
  apiHeaders,
  initPeer,
}: DropHandlerInputs<FileType>) => {
  const client = createClient(apiUri, { headers: apiHeaders });
  const timers = new Map<MessageType, NodeJS.Timeout>();

  // retry timers are scoped per grabber, so a slow grabber's retries
  // never collide with another grabber's expected reply
  const timersByGrabber = new Map<
    string,
    Map<MessageType, NodeJS.Timeout>
  >();

  const clearTimer = (grabberId: string, msgType: MessageType) => {
    const timers = timersByGrabber.get(grabberId);
    const timerId = timers?.get(msgType);

    if (timerId) {
      clearTimeout(timerId);
      timers!.delete(msgType);
    }
  };

  const cleanup = async () => {
    ctx.grabbers.forEach((grabber) => {
      try {
        grabber.connection.close();
      } catch (err) {
        console.error(err);
      }
    });

    if (ctx.peer) {
      try {
        ctx.peer.destroy();
      } catch (err) {
        console.error(err);
      }
    }

    if (ctx.id) {
      const dropId = ctx.id;

      await client.drop
        .$delete({ json: { id: dropId } })
        .catch((err) =>
          console.error(
            `Failed to clear session data from cache (drop: ${dropId})`,
            err,
          ),
        );
    }

    cleanupSession(ctx);
  };

  // session end: stop accepting -> reached cap. Deferred until then so
  // confirmed grabbers don't race the dropper tearing the session down.
  const completeAndCleanup = () => {
    setTimeout(() => cleanup(), 1000);
  };

  const sendMessage = async (
    grabberId: string,
    msg: BaseMessage,
    retryCount: number = 0,
  ) => {
    const grabber = ctx.grabbers.get(grabberId);

    if (!grabber) return;

    const expectedType = DropMessageOrderMap.get(msg.type)!;

    clearTimer(grabberId, expectedType);

    if (retryCount >= 3) {
      logger.error(
        `Attempt limit exceeded for type: ${msg.type} (grabber ${grabberId})`,
      );
      onRetryExceeded && onRetryExceeded(msg.type);
      return;
    }

    grabber.connection.send(msg);

    if (msg.type !== MessageType.ConfirmVerification) {
      const timer = setTimeout(
        () => sendMessage(grabberId, msg, retryCount + 1),
        1000,
      );

      let timers = timersByGrabber.get(grabberId);

      if (!timers) {
        timers = new Map();
        timersByGrabber.set(grabberId, timers);
      }

      timers.set(expectedType, timer);
    }
  };

  const startHandshake = async (grabberId: string) => {
    const { keyPair } = ctx;

    logger.info(
      `Beginning key exchange with grabber ${grabberId}...`,
    );

    const pubKeyAsString = await exportKey(keyPair!.publicKey);

    const message: HandshakeMessage = {
      type: MessageType.Handshake,
      input: pubKeyAsString,
    };

    sendMessage(grabberId, message);

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

    logger.info('Payload staged, ready to start session...');
  };

  const startSession = async () => {
    logger.info('Starting drop session, now accepting grabbers...');

    const event: WrapEvent = {
      type: DropEventType.Wrap,
      integrity: ctx.integrity!,
    };

    sendEvent(event);
  };

  const stopAccepting = () => {
    logger.info('No longer accepting new grabbers...');

    ctx.accepting = false;

    sendEvent({ type: DropEventType.StopAccepting });

    completeAndCleanup();
  };

  const onMessage = async (grabberId: string, msg: BaseMessage) => {
    clearTimer(grabberId, msg.type);

    const grabber = ctx.grabbers.get(grabberId);

    if (!grabber) {
      console.error(
        `Message received for unknown grabber: ${grabberId}`,
      );
      return;
    }

    if (msg.type === MessageType.Handshake) {
      const { input } = msg as HandshakeMessage;

      logger.info(
        `Handshake received from ${grabberId}, deriving drop key...`,
      );

      const pubKey = await importKey(input, []);
      const dropKey = await deriveKey(
        ctx.keyPair!.privateKey,
        pubKey,
      );

      grabber.dropKey = dropKey;

      logger.info(`Drop key derived for ${grabberId}...`);

      const isFile = ctx.mode === 'file';

      const payload = isFile
        ? await file.encrypt(
            dropKey,
            ctx.nonce!,
            ctx.message! as FileType,
          )
        : await encryptRaw(
            dropKey,
            ctx.nonce!,
            ctx.message! as string,
          );

      logger.info(`Payload encrypted for ${grabberId}, dropping...`);

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

      sendMessage(grabberId, message);

      const event: GrabberProgressEvent = {
        type: DropEventType.GrabberProgress,
        grabberId,
        status: GrabberStatus.Transferring,
      };

      sendEvent(event);
    } else if (msg.type === MessageType.Verify) {
      logger.info(
        `Integrity verification request received from ${grabberId}...`,
      );

      const { integrity } = msg as VerifyMessage;

      const verified = integrity === ctx.integrity!;

      const message: ConfirmIntegrityMessage = {
        type: MessageType.ConfirmVerification,
        verified,
      };

      sendMessage(grabberId, message);

      if (verified) {
        logger.info(`Grabber ${grabberId} confirmed receipt...`);

        grabber.status = GrabberStatus.Confirmed;
        grabber.confirmedAt = Date.now();

        sendEvent({
          type: DropEventType.GrabberConfirmed,
          grabberId,
        });

        if (reachedCap(ctx)) completeAndCleanup();
      } else {
        logger.error(`Grabber ${grabberId} failed verification...`);

        grabber.status = GrabberStatus.Failed;

        const event: GrabberFailedEvent = {
          type: DropEventType.GrabberFailed,
          grabberId,
        };

        sendEvent(event);
      }
    } else {
      console.error(`Invalid message received: ${msg.type}`);
    }
  };

  const onConnection = (newConnection: DataConnection) => {
    const grabberId = newConnection.peer;

    logger.info(`Grab request received from ${grabberId}!`);

    const grabber: GrabberRecord = {
      peerId: grabberId,
      connection: newConnection,
      dropKey: null,
      status: GrabberStatus.Connected,
      connectedAt: Date.now(),
      confirmedAt: null,
    };

    ctx.grabbers.set(grabberId, grabber);

    const handlerWithLock = withGrabberMessageLock(
      onMessage,
      logger.info,
    );

    newConnection.on('data', (data) =>
      handlerWithLock(grabberId, data as BaseMessage),
    );

    const event: GrabberConnectedEvent = {
      type: DropEventType.GrabberConnected,
      grabberId,
      connection: newConnection,
    };

    sendEvent(event);

    // TODO should replace timeout with a confirmation message from grabber
    setTimeout(() => startHandshake(grabberId), 1000);
  };

  const init = async () => {
    ctx.keyPair = await generateKeyPair();

    ctx.peer = await initPeer();

    ctx.peer.on('connection', onConnection);

    const resp = await client.drop.$post({
      json: {
        id: ctx.peer.id,
        ...(ctx.maxGrabbers != null
          ? { maxGrabbers: ctx.maxGrabbers }
          : {}),
      },
    });

    if (!resp.ok) {
      logger.error(
        resp.status === 403
          ? 'Requested grabber limit exceeds your plan!'
          : 'Failed to create drop!',
      );

      cleanup();

      return;
    }

    const { id, nonce }: InitDropResult = await resp.json();

    ctx.id = id;
    ctx.nonce = nonce;

    const initEvent: InitDropEvent = {
      type: DropEventType.Init,
      id: ctx.id!,
      peer: ctx.peer!,
      keyPair: ctx.keyPair!,
      nonce: ctx.nonce!,
      maxGrabbers: ctx.maxGrabbers,
    };

    sendEvent(initEvent);
  };

  return { init, stagePayload, startSession, stopAccepting };
};
