import Peer from 'peerjs';
import { generateId } from './util';
import { IceServerCredentials } from '../types/peer';

const isServer = typeof window === 'undefined';

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

export function createPeer(
  url: string,
  { username, credential }: IceServerCredentials,
) {
  const id = generateId();
  const server = new URL(url);

  const iceConfig = {
    iceServers: [
      {
        urls: 'stun:stun.relay.metered.ca:80',
      },
      {
        urls: 'turn:a.relay.metered.ca:80',
        username,
        credential,
      },
      {
        urls: 'turn:a.relay.metered.ca:443',
        username,
        credential,
      },
      {
        urls: 'turn:a.relay.metered.ca:443?transport=tcp',
        username,
        credential,
      },
    ],
  };

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
    peer.on('open', (id: string) => {
      if (!isServer) window.onbeforeunload = onUnload;

      resolve(peer);
    });
  });
}
