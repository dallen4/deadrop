import { app } from './app';
import { PeerServerDO } from './lib/durable_objects';

export default {
  fetch: app.fetch,
};

export { PeerServerDO };
