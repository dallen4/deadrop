import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { createDropHandlers } from 'handlers/drop';
import { initDropContext } from 'lib/machines/drop';
import {
  deriveKey,
  encryptRaw,
  exportKey,
  generateKeyPair,
  hashRaw,
  importKey,
} from 'lib/crypto/operations';
import { generateIV } from 'lib/util';
import { MessageType } from 'lib/constants';
import { GrabberStatus } from 'types/drop';
import { DropMessage, HandshakeMessage } from 'types/messages';
import type { DataConnection } from 'peerjs';
import type Peer from 'peerjs';

const createFakeConnection = (peerId: string) => {
  let dataListener: ((data: unknown) => void) | undefined;

  const connection = {
    peer: peerId,
    send: vi.fn(),
    close: vi.fn(),
    on: vi.fn((event: string, cb: (data: unknown) => void) => {
      if (event === 'data') dataListener = cb;
    }),
  } as unknown as DataConnection;

  return {
    connection,
    emitData: (data: unknown) => dataListener?.(data),
  };
};

const createFakePeer = () => {
  let connectionListener:
    | ((conn: DataConnection) => void)
    | undefined;

  const peer = {
    id: 'dropper-peer-id',
    destroy: vi.fn(),
    on: vi.fn(
      (event: string, cb: (conn: DataConnection) => void) => {
        if (event === 'connection') connectionListener = cb;
      },
    ),
  } as unknown as Peer;

  return {
    peer,
    connect: (conn: DataConnection) => connectionListener?.(conn),
  };
};

const fetchJson = (body: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );

// simulates a grabber sending its handshake & deriving the same shared
// secret independently, to confirm the dropper's derived key actually
// decrypts what the dropper sent
const grabberHandshake = async (dropperPublicKeyExport: string) => {
  const keyPair = await generateKeyPair();
  const dropperPubKey = await importKey(dropperPublicKeyExport, []);
  const grabKey = await deriveKey(keyPair.privateKey, dropperPubKey);

  return {
    publicKeyExport: await exportKey(keyPair.publicKey),
    grabKey,
  };
};

describe('createDropHandlers (multidrop)', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.includes('/drop') && !url.includes('id=')) {
        // POST /drop (create) — also matches DELETE since same path
        return fetchJson({
          id: 'mock-drop-id',
          nonce: generateIV(),
        });
      }

      return fetchJson({ success: true });
    });

    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const setup = async (maxGrabbers: number | null) => {
    const ctx = initDropContext();
    ctx.maxGrabbers = maxGrabbers;

    const fakePeer = createFakePeer();
    const sendEvent = vi.fn();
    const cleanupSession = vi.fn();

    const handlers = createDropHandlers({
      ctx,
      sendEvent,
      logger: { info: () => {}, error: () => {}, debug: () => {} },
      file: {
        encrypt: async () => '',
        hash: async () => '',
      },
      cleanupSession,
      initPeer: async () => fakePeer.peer,
    });

    await handlers.init();
    await handlers.stagePayload('the secret', 'raw');
    await handlers.startSession();

    return { ctx, handlers, fakePeer, sendEvent, cleanupSession };
  };

  it('derives a distinct drop key per grabber and encrypts the payload separately for each', async () => {
    const { ctx, fakePeer } = await setup(2);

    const connA = createFakeConnection('grabber-a');
    const connB = createFakeConnection('grabber-b');

    fakePeer.connect(connA.connection);
    fakePeer.connect(connB.connection);

    const grabberA = await grabberHandshake(
      await exportKey(ctx.keyPair!.publicKey),
    );
    const grabberB = await grabberHandshake(
      await exportKey(ctx.keyPair!.publicKey),
    );

    const handshakeA: HandshakeMessage = {
      type: MessageType.Handshake,
      input: grabberA.publicKeyExport,
    };
    const handshakeB: HandshakeMessage = {
      type: MessageType.Handshake,
      input: grabberB.publicKeyExport,
    };

    await connA.emitData(handshakeA);
    await connB.emitData(handshakeB);

    const recordA = ctx.grabbers.get('grabber-a')!;
    const recordB = ctx.grabbers.get('grabber-b')!;

    expect(recordA.dropKey).not.toBeNull();
    expect(recordB.dropKey).not.toBeNull();

    // each grabber's connection received its own DropMessage
    expect(connA.connection.send).toHaveBeenCalledTimes(1);
    expect(connB.connection.send).toHaveBeenCalledTimes(1);

    const payloadA = (connA.connection.send as ReturnType<typeof vi.fn>)
      .mock.calls[0][0] as DropMessage;
    const payloadB = (connB.connection.send as ReturnType<typeof vi.fn>)
      .mock.calls[0][0] as DropMessage;

    // same plaintext + same nonce, but distinct per-grabber keys produce
    // distinct ciphertext
    expect(payloadA.payload).not.toEqual(payloadB.payload);

    // each grabber can independently decrypt using its own derived key
    const expectedCipherA = await encryptRaw(
      recordA.dropKey!,
      ctx.nonce!,
      'the secret',
    );
    const expectedCipherB = await encryptRaw(
      recordB.dropKey!,
      ctx.nonce!,
      'the secret',
    );

    expect(payloadA.payload).toEqual(expectedCipherA);
    expect(payloadB.payload).toEqual(expectedCipherB);
  });

  it('confirms grabbers independently and only completes/cleans up once cap is reached', async () => {
    const { ctx, fakePeer, cleanupSession } = await setup(2);

    const connA = createFakeConnection('grabber-a');
    const connB = createFakeConnection('grabber-b');

    fakePeer.connect(connA.connection);
    fakePeer.connect(connB.connection);

    const grabberA = await grabberHandshake(
      await exportKey(ctx.keyPair!.publicKey),
    );
    const grabberB = await grabberHandshake(
      await exportKey(ctx.keyPair!.publicKey),
    );

    await connA.emitData({
      type: MessageType.Handshake,
      input: grabberA.publicKeyExport,
    });
    await connB.emitData({
      type: MessageType.Handshake,
      input: grabberB.publicKeyExport,
    });

    const integrity = await hashRaw('the secret');

    await connA.emitData({ type: MessageType.Verify, integrity });

    expect(ctx.grabbers.get('grabber-a')?.status).toBe(
      GrabberStatus.Confirmed,
    );
    expect(cleanupSession).not.toHaveBeenCalled();

    await connB.emitData({ type: MessageType.Verify, integrity });

    expect(ctx.grabbers.get('grabber-b')?.status).toBe(
      GrabberStatus.Confirmed,
    );

    // cleanup is deferred via setTimeout
    await new Promise((resolve) => setTimeout(resolve, 1100));

    expect(cleanupSession).toHaveBeenCalledTimes(1);
  });

  it('marks a grabber failed on integrity mismatch without affecting others', async () => {
    const { ctx, fakePeer } = await setup(2);

    const connA = createFakeConnection('grabber-a');

    fakePeer.connect(connA.connection);

    const grabberA = await grabberHandshake(
      await exportKey(ctx.keyPair!.publicKey),
    );

    await connA.emitData({
      type: MessageType.Handshake,
      input: grabberA.publicKeyExport,
    });

    await connA.emitData({
      type: MessageType.Verify,
      integrity: 'not-the-real-integrity-hash',
    });

    expect(ctx.grabbers.get('grabber-a')?.status).toBe(
      GrabberStatus.Failed,
    );
  });
});
