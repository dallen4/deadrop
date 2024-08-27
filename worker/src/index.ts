const WELCOME_TEXT =
  '{"name":"PeerJS Server","description":"A server side element to broker connections between PeerJS clients.","website":"https://peerjs.com/"}';
const HEARTBEAT = '{"type":"HEARTBEAT"}';
const OPEN = '{"type":"OPEN"}';
const ID_TAKEN =
  '{"type":"ID-TAKEN","payload":{"msg":"ID is taken"}}';

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

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    switch (url.pathname) {
      case '/':
        return new Response(WELCOME_TEXT);
      case '/peerjs':
        let objId = env.PEER_SERVER.idFromName(url.host);
        let stub = env.PEER_SERVER.get(objId);
        return stub.fetch(request);
      case '/peerjs/id':
        return new Response(crypto.randomUUID(), {
          status: 200,
          headers: {
            'Content-Type': 'text/plain',
            'Access-Control-Allow-Origin': '*',
          },
        });
      default:
        return new Response(null, { status: 404 });
    }
  },
};
