const esbuild = require('esbuild');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

const define = {
  'process.env.DEADROP_APP_URL': JSON.stringify(
    process.env.DEADROP_APP_URL || '',
  ),
  'process.env.DEADROP_API_URL': JSON.stringify(
    process.env.DEADROP_API_URL || '',
  ),
  'process.env.PEER_SERVER_URL': JSON.stringify(
    process.env.PEER_SERVER_URL || '',
  ),
  'process.env.TURN_USERNAME': JSON.stringify(process.env.TURN_USERNAME || ''),
  'process.env.TURN_PWD': JSON.stringify(process.env.TURN_PWD || ''),
  'process.env.CLERK_PUBLISHABLE_KEY': JSON.stringify(
    process.env.CLERK_PUBLISHABLE_KEY || '',
  ),
};

/** @type {import('esbuild').BuildOptions} */
const buildOptions = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  outfile: 'dist/extension.js',
  external: ['vscode', '@libsql/client', 'drizzle-orm'],
  sourcemap: !production,
  minify: production,
  define,
  alias: {
    '@shared': path.resolve(__dirname, '../../shared'),
  },
};

if (watch) {
  esbuild.context(buildOptions).then((ctx) => ctx.watch());
} else {
  esbuild.build(buildOptions).catch(() => process.exit(1));
}
