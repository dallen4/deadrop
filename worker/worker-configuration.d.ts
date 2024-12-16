interface Env {
  DROP_STORE: KVNamespace;

  // Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  PEER_SERVER: DurableObjectNamespace;

  // variables
  DAILY_DROP_LIMIT: number;

  // secrets
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;

  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;

  TURSO_ORGANIZATION: string;
  TURSO_PLATFORM_API_TOKEN: string;
}
