import { createClerkClient } from 'lib/auth/clerk';
import { createLocalAuthServer } from 'lib/auth/localhostServer';
// import { loadConfig } from 'lib/config';
import { LOCALHOST_AUTH_URL, LOGIN_URL } from 'lib/constants';
import { logError, logInfo } from 'lib/log';
import open from 'open';

export default async function login() {
  // const { config } = await loadConfig();

  // const { vaults, active_vault } = config;
  console.log('INITING CLERK');
  const clerkClient = await createClerkClient();
  console.log('STARTING SERVER');
  const { listenForAuthRedirect } = await createLocalAuthServer();

  const newUrl = new URL(LOGIN_URL);
  newUrl.searchParams.set('redirectUrl', LOCALHOST_AUTH_URL);
  const url = encodeURI(newUrl.toString());
  console.log(url);
  await open(url);

  let success = false;

  try {
    const token = await listenForAuthRedirect();
    console.log('TOKEN RETRIEVED', token);
    if (token) {
      const res = await clerkClient.client?.signIn.create({
        strategy: 'ticket',
        ticket: token,
      });
      success = (res && res.status !== 'complete') || false;
      console.log(clerkClient.client?.activeSessions[0].user);
    }
  } catch (err) {
    console.error(err);
  }

  if (success) logInfo('Successfully logged in!');
  else logError('Authentication with provided token failed!');

  process.exit(success ? 0 : 1);
}
