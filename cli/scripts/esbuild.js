require('dotenv').config();

const { build } = require('esbuild');
const { environmentPlugin } = require('esbuild-plugin-environment');

if (!process.env.DEADDROP_API_URL || !process.env.PEER_SERVER_URL) {
    console.error('Invalid environment configuration provided');
    process.exit(1);
}

(async () => {
    await build({
        entryPoints: {
            'deadrop': 'index.ts',
            'inject': 'inject.ts',
        },
        outdir: 'dist',
        platform: 'node',
        bundle: true,
        inject: ['./scripts/inject.js'],
        loader: { '.node': 'file' },
        external: ['libsql'],
        plugins: [
            environmentPlugin({
                DEADDROP_API_URL: process.env.DEADDROP_API_URL,
                PEER_SERVER_URL: process.env.PEER_SERVER_URL,
            }),
        ],
    }).catch((err) => {
        process.stderr.write(err.stderr);
        process.exit(1);
    });
})();
