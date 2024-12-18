import { createLocalAuthServer } from '../lib/auth/localhostServer';

(async () => {
  const { listenForAuthRedirect } = await createLocalAuthServer();

  console.log('server up');

  const value = await listenForAuthRedirect();
})();
