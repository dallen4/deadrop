import { DurableObject } from 'cloudflare:workers';

export class DropSessionDO extends DurableObject<Env> {
  private sessions: Map<WebSocket, any>;

  constructor(private state: DurableObjectState, env: Env) {
    super(state, env);

    // aggregate existing websockets into session Map
    this.sessions = new Map();

    this.state.getWebSockets().forEach((webSocket) => {
      let meta = webSocket.deserializeAttachment();

      this.sessions.set(webSocket, { ...meta });
    });
  }

  async fetch(req: Request) {
    const url = new URL(req.url);

    if (req.method === 'POST') {
      // TODO create drop
    } else if (req.method === 'GET') {
      // TODO get drop
    } else if (req.method === 'DELETE') {
      // TODO cleanup sessions and delete drop
    }

    const { 0: wsClient, 1: wsServer } = new WebSocketPair();

    const AckWSResponse = new Response(null, {
      webSocket: wsClient,
      status: 101,
    });

    this.state.acceptWebSocket(wsServer, ['id']);

    return AckWSResponse;
  }

  webSocketMessage(
    ws: WebSocket,
    message: string,
  ): void | Promise<void> {
    const [mode] = this.state.getTags(ws);

    if (mode === 'drop') {
      const grabConnections = this.state.getWebSockets('grab');
    } else if (mode === 'grab') {
      const [dropConnection] = this.state.getWebSockets('drop');
    }
  }

  webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
    wasClean: boolean,
  ): void | Promise<void> {
    this.sessions.delete(ws);
  }
}
