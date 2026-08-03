import { createPeerFromConfig } from '@shared/lib/peer';
import { PEER_SERVER_URL, TURN_USERNAME, TURN_PWD } from '../env';

// Builds a PeerJS peer from desktop env. The webview has native WebRTC, so
// this uses the browser PeerJS path (no @roamhq/wrtc like the CLI needs).
export const initPeer = () =>
  createPeerFromConfig({
    url: PEER_SERVER_URL,
    turn: {
      username: TURN_USERNAME,
      credential: TURN_PWD,
    },
  });
