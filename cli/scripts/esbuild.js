require('dotenv').config();

const { build } = require('esbuild');
const { environmentPlugin } = require('esbuild-plugin-environment');

if (!process.env.DEADROP_API_URL || !process.env.PEER_SERVER_URL) {
  console.error('Invalid environment configuration provided');
  process.exit(1);
}

(async () => {
  await build({
    entryPoints: ['index.ts'],
    outfile: 'dist/deadrop.js',
    platform: 'node',
    bundle: true,
    inject: ['./scripts/inject.js'],
    loader: { '.node': 'file' },
    external: ['libsql'],
    plugins: [
      environmentPlugin({
        DEADROP_API_URL: process.env.DEADROP_API_URL,
        PEER_SERVER_URL: process.env.PEER_SERVER_URL,
        CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY,
      }),
    ],

    // ref: https://github.com/sindresorhus/open/issues/330#issuecomment-2047513034
    define: { 'import.meta.url': '_importMetaUrl' },
    banner: {
      js: "const _importMetaUrl=require('url').pathToFileURL(__filename)",
    },
  }).catch((err) => {
    process.stderr.write(err.stderr);
    process.exit(1);
  });
})();
