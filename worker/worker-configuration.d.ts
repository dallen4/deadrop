interface Env {
  DROP_STORE: KVNamespace;

  // Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  PEER_SERVER: DurableObjectNamespace;
}
