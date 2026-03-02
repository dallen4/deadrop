import { createRequestHandler, RouterContextProvider } from 'react-router';

declare module 'react-router' {
  interface RouterContextProvider {
    cloudflare: {
      env: Env;
      ctx: ExecutionContext;
    };
  }
}

function getLoadContext(input: {
      env: Env;
      ctx: ExecutionContext;
    }) {
  const context = new RouterContextProvider();
  Object.assign(context, input);
  return context;
}

// ref: https://github.com/rphlmr/react-router-hono-server/issues/97#issuecomment-2764497326
const requestHandler = createRequestHandler(
  () => import('virtual:react-router/server-build'),
  import.meta.env.MODE,
);

export default {
  async fetch(request, env, ctx) {
    return requestHandler(request, getLoadContext({ env, ctx }));
  },
} satisfies ExportedHandler<Env>;
