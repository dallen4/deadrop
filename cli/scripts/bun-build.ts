// @ts-nocheck
import { build, BunPlugin } from 'bun';
import { platform, arch } from 'os';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const p = platform();
const a = arch();
const sysCode = `${p}-${a}`;

// libsql platform-tagged packages: darwin-{arm64,x64}, linux-{arm64,x64}-gnu, win32-x64-msvc
const libsqlSuffixMap: Record<string, string> = {
  'darwin-arm64': 'darwin-arm64',
  'darwin-x64': 'darwin-x64',
  'linux-x64': 'linux-x64-gnu',
  'linux-arm64': 'linux-arm64-gnu',
  'win32-x64': 'win32-x64-msvc',
};
const libsqlSuffix = libsqlSuffixMap[sysCode];
if (!libsqlSuffix) {
  console.error(`Unsupported platform for libsql: ${sysCode}`);
  process.exit(1);
}

// Resolve the absolute path to the platform-tagged libsql .node file.
// Used by the libsqlNativePlugin below.
const libsqlNodePath = resolve(
  require.resolve(`@libsql/${libsqlSuffix}`),
);


const env = {
  DEADROP_API_URL: process.env.DEADROP_API_URL!,
  DEADROP_APP_URL: process.env.DEADROP_APP_URL!,
  PEER_SERVER_URL: process.env.PEER_SERVER_URL!,
  CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY!,
};

if (!env.DEADROP_API_URL || !env.PEER_SERVER_URL) {
  console.error('Invalid environment configuration');
  process.exit(1);
}

const envVars = Object.fromEntries(
  Object.entries(env).map(([k, v]) => [
    `process.env.${k}`,
    JSON.stringify(v),
  ]),
);

// Inject figlet font data as a build-time constant
const figletPkgDir = resolve(require.resolve('figlet'), '..', '..');
const figletFontPath = resolve(figletPkgDir, 'fonts', 'Standard.flf');
const figletFontData = readFileSync(figletFontPath, 'utf8');
envVars['FIGLET_STANDARD_FONT'] = JSON.stringify(figletFontData);

// Plugin: rewrite the `libsql` package's requireNative() so it loads the
// .node file via a static absolute path instead of a dynamic
// require(`@libsql/${target}`) that Bun's bundler can't trace.
const libsqlNativePlugin: BunPlugin = {
  name: 'libsql-native',
  setup(builder) {
    builder.onLoad(
      { filter: /node_modules[\/\\]libsql[\/\\]index\.js$/ },
      async (args) => {
        const src = readFileSync(args.path, 'utf8');
        const patched = src.replace(
          /function requireNative\(\)[\s\S]*?^}/m,
          `function requireNative() { return require("${libsqlNodePath}"); }`,
        );
        return { contents: patched, loader: 'js' };
      },
    );
  },
};

// @ts-expect-error Top-level await is valid in Bun
await build({
  entrypoints: ['./index.ts'],
  compile: {
    target: `bun-${sysCode}`,
    outfile: './dist/deadrop',
  },
  naming: 'deadrop',
  minify: true,
  define: envVars,
  plugins: [libsqlNativePlugin],
});
