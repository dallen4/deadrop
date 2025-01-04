import { createClerkClient } from 'lib/auth/clerk';
import { createLocalAuthServer } from 'lib/auth/localhostServer';
import { LOCALHOST_AUTH_URL, LOGIN_URL } from 'lib/constants';
import { loader, logError, logInfo } from 'lib/log';
import open from 'open';

export default async function login() {
  const clerkClient = await createClerkClient();

  if (clerkClient.session) {
    logInfo(
      `You're already signed in as ${clerkClient.session.user.emailAddresses[0]}!`,
    );

    return process.exit(0);
  }

  const { listenForAuthRedirect } = await createLocalAuthServer();

  const newUrl = new URL(LOGIN_URL);
  newUrl.searchParams.set('redirectUrl', LOCALHOST_AUTH_URL);

  const url = encodeURI(newUrl.toString());

  loader.start('Opening webpage for authentication...');

  await open(url);

  let success = false;

  try {
    loader.text = 'Awaiting confirmation in the browser...';

    const token = await listenForAuthRedirect();

    if (token) {
      loader.text = 'Authenticating CLI and storing credentials...';

      const res = await clerkClient.client?.signIn.create({
        strategy: 'ticket',
        ticket: token,
      });

      success = (res && res.status === 'complete') || false;
    } else throw new Error('Failed to authenticate!');
  } catch (err) {
    console.error(err);
  }

  loader.stop();

  if (success) logInfo('Successfully logged in!');
  else logError('Authentication with provided token failed!');

  process.exit(success ? 0 : 1);
}
