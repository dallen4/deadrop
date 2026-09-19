import Peer from 'peerjs';
import { generateId } from './util';
import {
  IceServerConfiguration,
  IceServerCredentials,
} from '../types/peer';

const isServer =
  typeof window === 'undefined' ||
  typeof window.removeEventListener !== 'function';

const onUnload = (e: BeforeUnloadEvent) => {
  const event = e || window.event;

  if (event) event.returnValue = 'Are you sure you want to leave?';

  return 'Are you sure you want to leave?';
};

export const removeOnUnloadListener = () => {
  if (!isServer) {
    window.onbeforeunload = null;
    window.removeEventListener('beforeunload', onUnload);
  }
};

export interface PeerConfig {
  url: string;
  turn: IceServerCredentials;
}

// Cloudflare's generate-ice-servers response carries these same hosts; we
// pin them rather than round-tripping the urls so the API surface stays
// credentials-only. Port 53 variants are deliberately omitted (browsers
// reject them).
const buildIceServers = ({
  username,
  credential,
}: IceServerCredentials): IceServerConfiguration => [
  { urls: ['stun:stun.cloudflare.com:3478'] },
  {
    urls: [
      'turn:turn.cloudflare.com:3478?transport=udp',
      'turn:turn.cloudflare.com:3478?transport=tcp',
      'turns:turn.cloudflare.com:5349?transport=tcp',
    ],
    username,
    credential,
  },
];

// Convenience wrapper so platform adapters can build a peer from a single
// config object (url + TURN creds) sourced from their own env/settings.
export const createPeerFromConfig = (
  { url, turn }: PeerConfig,
  id?: string,
) => createPeer(url, turn, id);

export function createPeer(
  url: string,
  creds: IceServerCredentials,
  // The dropper mints its peer id up front so it can claim the drop
  // record before the peer connects; grabbers let it default.
  id: string = generateId(),
) {
  const server = new URL(url);

  const iceConfig = { iceServers: buildIceServers(creds) };

  const peer = new Peer(id, {
    host: server.host,
    path: server.pathname,
    secure: true,
    port: 443,
    config: iceConfig,
  });

  peer.on('call', (call) => {
    console.log('Call attempted by: ', call.peer);
    call.close();
  });

  peer.on('error', (err) => {
    console.error(err);

    if (peer.disconnected) {
      console.log('reconnecting');
      peer.reconnect();
    }
  });

  peer.on('disconnected', removeOnUnloadListener);

  peer.on('close', removeOnUnloadListener);

  return new Promise<Peer>((resolve) => {
    peer.on('open', () => {
      if (!isServer) window.onbeforeunload = onUnload;

      resolve(peer);
    });
  });
}
