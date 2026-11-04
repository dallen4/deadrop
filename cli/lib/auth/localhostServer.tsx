import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { html } from 'hono/html';
import {
  LOCALHOST_AUTH_HOST,
  LOCALHOST_AUTH_PORT,
} from '../constants';
import { Server, Socket } from 'net';
import { LoginSuccess } from './snippets';

const PATH = '/';

// Force destroy server + open connections
const createDestroy = (server: Server) => {
  const connections: Socket[] = [];
  server.on('connection', (c) => connections.push(c));

  return () => {
    connections.forEach((c) => c.destroy());
    server.close();
  };
};

// Loopback-only, and only the redirect carrying this login's state is
// accepted, so another process can't hand the CLI its own ticket.
export const createLocalAuthServer = async (
  expectedState: string,
) => {
  let authToken: string | null = null;

  const app = new Hono();

  const server = serve({
    fetch: app.fetch,
    port: LOCALHOST_AUTH_PORT,
    hostname: LOCALHOST_AUTH_HOST,
  });

  const destroyServer = createDestroy(server);

  const listenForAuthRedirect = () =>
    new Promise((resolve, reject) => {
      server.addListener('close', () => {
        resolve(authToken);
      });

      app.get(PATH, (c) => {
        const code = c.req.query('token');

        if (!code || c.req.query('state') !== expectedState)
          return c.text('Invalid login request.', 400);

        authToken = code;
        // let the success page flush before tearing the sockets down
        setTimeout(destroyServer, 100);

        c.header('Connection', 'close');
        return c.html(<LoginSuccess />);
      });
    }) as Promise<string | null>;

  return { listenForAuthRedirect };
};
