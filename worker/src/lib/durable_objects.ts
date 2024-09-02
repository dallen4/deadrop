const HEARTBEAT = JSON.stringify({ type: 'HEARTBEAT' });
const OPEN = JSON.stringify({ type: 'OPEN' });
const ID_TAKEN = JSON.stringify({
  type: 'ID-TAKEN',
  payload: { msg: 'ID is taken' },
});

export class PeerServerDO implements DurableObject {
  constructor(private state: DurableObjectState, private env: Env) {
    this.state.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair(HEARTBEAT, HEARTBEAT),
    );
  }

  async fetch(request: Request) {
    const url = new URL(request.url);

    const id = url.searchParams.get('id');
    const token = url.searchParams.get('token');

    if (!id || !token) return new Response(null, { status: 400 });

    const [wsclient, wsserver] = Object.values(new WebSocketPair());

    const existingWss = this.state.getWebSockets(id);

    if (
      existingWss.length > 0 &&
      existingWss[0].deserializeAttachment().token !== token
    ) {
      wsserver.accept();
      wsserver.send(ID_TAKEN);
      wsserver.close(1008, 'ID is taken');
      return new Response(null, { webSocket: wsclient, status: 101 });
    } else {
      existingWss.forEach((ws) => ws.close(1000));
    }

    this.state.acceptWebSocket(wsserver, [id]);
    wsserver.serializeAttachment({ id, token });
    wsserver.send(OPEN);

    return new Response(null, { webSocket: wsclient, status: 101 });
  }

  webSocketMessage(
    ws: WebSocket,
    message: string,
  ): void | Promise<void> {
    const msg = JSON.parse(message);
    const dstWs = this.state.getWebSockets(msg.dst)[0];

    msg.src = ws.deserializeAttachment().id;

    dstWs.send(JSON.stringify(msg));
  }
}
