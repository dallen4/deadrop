import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { html } from 'hono/html';
import { LOCALHOST_AUTH_PORT } from 'lib/constants';
import { Server, Socket } from 'net';

const PATH = '/';

const successHtml = html`
  <body>
    <main
      style="height: 100%; width: 100%; display: flex;justify-content: center;align-items: center"
    >
      <div>
        <h1>Signed in</h1>
        <h2>
          You can safely close this tab and return to your terminal
        </h2>
      </div>
    </main>
  </body>
`;

// Force destroy server + open connections
const createDestroy = (server: Server) => {
  const connections: Socket[] = [];
  server.on('connection', (c) => connections.push(c));

  return () => {
    connections.forEach((c) => c.destroy());
    server.close();
  };
};

export const createLocalAuthServer = async () => {
  let authToken: string | null = null;

  const app = new Hono();

  const server = serve({
    fetch: app.fetch,
    port: LOCALHOST_AUTH_PORT,
  });

  const destroyServer = createDestroy(server);

  const listenForAuthRedirect = () =>
    new Promise((resolve, reject) => {
      if (!server.listening) server.listen();

      server.addListener('close', () => {
        resolve(authToken);
      });

      app.use(PATH, async (_, next) => {
        await next();
        process.nextTick(() => destroyServer());
      });

      app.get(PATH, (c) => {
        const code = c.req.query('token') as string;

        authToken = code;

        return c.html(successHtml);
      });
    }) as Promise<string | null>;

  return { listenForAuthRedirect };
};
