import { createPeerFromConfig } from '@shared/lib/peer';
import type { IceServerCredentials } from '@shared/types/peer';
import { PEER_SERVER_URL } from '../env';

// Builds a PeerJS peer from desktop env plus the TURN credentials the
// worker minted for this session. The webview has native WebRTC, so this
// uses the browser PeerJS path (no @roamhq/wrtc like the CLI needs).
export const initPeer = (creds: IceServerCredentials, id?: string) =>
  createPeerFromConfig({ url: PEER_SERVER_URL, turn: creds }, id);
