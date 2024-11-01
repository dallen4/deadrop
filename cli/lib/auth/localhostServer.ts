import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { html } from 'hono/html';
import { LOCALHOST_AUTH_PORT } from 'lib/constants';
import { Server, Socket } from 'net';

const PATH = '/';

const successHtml = html`
  <html>
    <head>
      <title>Login Success!</title>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/@mantine/core@7.13.4/styles.min.css"
      />

      <style>
        body {
          margin: 0;
          padding: 0;
        }

        main {
          background-color: #1a1b1e;
          height: 100%;
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        h1 {
          color: #1971c2;
        }

        h2 {
          color: rgb(248, 249, 250);
        }
      </style>
    </head>
    <body>
      <main>
        <div>
          <h1 class="styles-Text-root styles-Title-root">You're all set!</h1>
          <h2 class="styles-Text-root">
            You can safely close this tab and return to your terminal
          </h2>
        </div>
      </main>
    </body>
  </html>
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
