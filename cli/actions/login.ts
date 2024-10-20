import { createClerkClient } from 'lib/auth/clerk';
import { createLocalAuthServer } from 'lib/auth/localhostServer';
import { loadConfig } from 'lib/config';
import { LOCALHOST_AUTH_URL, LOGIN_URL } from 'lib/constants';
import { logError, logInfo } from 'lib/log';
import open from 'open';

export default async function login() {
  const { config } = await loadConfig();

  const { vaults, active_vault } = config;

  const clerkClient = await createClerkClient();

  const { listenForAuthRedirect } = await createLocalAuthServer();

  const url = encodeURI(
    `${LOGIN_URL}?redirectUrl=${LOCALHOST_AUTH_URL}`,
  );

  await open(url);

  const token = await listenForAuthRedirect();

  const res = await clerkClient.client?.signIn.create({
    strategy: 'ticket',
    ticket: token,
  });

  const success = (res && res.status !== 'complete') || false;

  if (success) logError('Authentication with provided token failed!');
  else logInfo('Successfully logged in!');

  process.exit(success ? 0 : 1);
}
