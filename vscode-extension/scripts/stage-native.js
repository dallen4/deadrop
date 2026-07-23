#!/usr/bin/env node

// Stages the native libsql binding into dist/node_modules so it ships
// inside the vsix (vsce --no-dependencies always drops top-level
// node_modules, but dist/** packages normally and Node resolves
// require('libsql') from dist/extension.js through dist/node_modules).
// Pure-JS deps (@libsql/client, drizzle-orm) are bundled into
// dist/extension.js by esbuild — only the native binding and its
// loader ship as packages.
//
// Usage: node scripts/stage-native.js [vsce-target]
// Defaults to the host platform when no target is given.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const TARGET_TO_LIBSQL = {
  'darwin-arm64': '@libsql/darwin-arm64',
  'darwin-x64': '@libsql/darwin-x64',
  'linux-x64': '@libsql/linux-x64-gnu',
  'linux-arm64': '@libsql/linux-arm64-gnu',
  'linux-armhf': '@libsql/linux-arm-gnueabihf',
  'alpine-x64': '@libsql/linux-x64-musl',
  'alpine-arm64': '@libsql/linux-arm64-musl',
  'win32-x64': '@libsql/win32-x64-msvc',
};

const extensionRoot = path.resolve(__dirname, '..');
const target =
  process.argv[2] ?? `${process.platform}-${process.arch}`;
const platformPkg = TARGET_TO_LIBSQL[target];

if (!platformPkg) {
  console.error(
    `Unsupported target "${target}". Known: ${Object.keys(TARGET_TO_LIBSQL).join(', ')}`,
  );
  process.exit(1);
}

// Resolve the installed libsql via @libsql/client (pnpm keeps
// transitive deps out of direct resolution paths).
function resolvePkgDir(name, fromDir) {
  // Resolve the entry point, then walk up to the package root —
  // exports maps often block resolving package.json directly.
  let dir = path.dirname(
    require.resolve(name, { paths: [fromDir] }),
  );
  while (!fs.existsSync(path.join(dir, 'package.json'))) {
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(`package root not found for ${name}`);
    }
    dir = parent;
  }
  return dir;
}

const clientDir = resolvePkgDir('@libsql/client', extensionRoot);
const libsqlDir = resolvePkgDir('libsql', clientDir);
const libsqlPkg = require(path.join(libsqlDir, 'package.json'));

const stageRoot = path.join(extensionRoot, 'dist', 'node_modules');

function stage(name, srcDir) {
  const dest = path.join(stageRoot, name);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  // dereference: pnpm dirs are symlinks; the vsix needs real files
  fs.cpSync(srcDir, dest, { recursive: true, dereference: true });
  console.log(
    `staged ${name} -> ${path.relative(extensionRoot, dest)}`,
  );
}

// Fetch a package from npm when it isn't installed locally (CI stages
// all platforms from a single linux runner).
function fetchPkg(name, version) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'deadrop-stage-'));
  execSync(`npm pack ${name}@${version} --pack-destination "${tmp}"`, {
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  const tarball = fs
    .readdirSync(tmp)
    .find((f) => f.endsWith('.tgz'));
  execSync(`tar -xzf "${path.join(tmp, tarball)}" -C "${tmp}"`);
  return path.join(tmp, 'package');
}

// Fresh staging area so a vsix never ships stale packages or more
// than one platform binary.
fs.rmSync(stageRoot, { recursive: true, force: true });

stage('libsql', libsqlDir);
for (const dep of Object.keys(libsqlPkg.dependencies ?? {})) {
  stage(dep, resolvePkgDir(dep, libsqlDir));
}

const platformVersion = libsqlPkg.optionalDependencies[platformPkg];
let platformDir;
try {
  platformDir = resolvePkgDir(platformPkg, libsqlDir);
} catch {
  platformDir = fetchPkg(platformPkg, platformVersion);
}
stage(platformPkg, platformDir);

console.log(`native staging complete for ${target} (${platformPkg})`);
