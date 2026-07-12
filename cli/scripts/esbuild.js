require('dotenv').config();

const { build } = require('esbuild');
const { environmentPlugin } = require('esbuild-plugin-environment');

const requiredEnv = [
  'DEADROP_API_URL',
  'DEADROP_APP_URL',
  'PEER_SERVER_URL',
  'CLERK_PUBLISHABLE_KEY',
  'TURN_USERNAME',
  'TURN_PWD',
];

const missing = requiredEnv.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(
    `Invalid environment configuration, missing: ${missing.join(', ')}`,
  );
  process.exit(1);
}

(async () => {
  await build({
    entryPoints: ['index.ts'],
    outfile: 'dist/deadrop.js',
    platform: 'node',
    bundle: true,
    minifySyntax: true,
    inject: ['./scripts/inject.js'],
    loader: { '.node': 'file' },
    external: ['libsql', 'node-datachannel', '@napi-rs/keyring'],
    plugins: [
      environmentPlugin({
        DEADROP_API_URL: process.env.DEADROP_API_URL,
        DEADROP_APP_URL: process.env.DEADROP_APP_URL,
        PEER_SERVER_URL: process.env.PEER_SERVER_URL,
        CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY,
        TURN_USERNAME: process.env.TURN_USERNAME,
        TURN_PWD: process.env.TURN_PWD,
        // baked in at build time so `deadrop update` can tell which
        // pipeline produced this artifact without a runtime check
        DEADROP_INSTALL_METHOD: 'npm',
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
