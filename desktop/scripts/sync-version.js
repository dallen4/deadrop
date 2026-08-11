// package.json is the only version changesets bumps, but Tauri names every
// bundle from tauri.conf.json and Cargo owns the other two. Left unsynced they
// drift silently: release deadrop-desktop@0.2.2 shipped a full set of assets
// named 0.1.0.
//
// Run with --check to fail instead of writing (CI drift guard).

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const SOURCE = join(root, 'package.json');
const TAURI_CONF = join(root, 'src-tauri/tauri.conf.json');
const CARGO_TOML = join(root, 'src-tauri/Cargo.toml');
const CARGO_LOCK = join(root, 'src-tauri/Cargo.lock');

// Anchored so they can only ever match the package's own version, never a
// dependency's.
const CARGO_TOML_VERSION = /(\[package\][\s\S]*?\nversion = )"[^"]*"/;
const CARGO_LOCK_VERSION =
  /(\[\[package\]\]\nname = "deadrop"\nversion = )"[^"]*"/;

const check = process.argv.includes('--check');
const { version } = JSON.parse(readFileSync(SOURCE, 'utf8'));

if (!version) {
  console.error('No version field in desktop/package.json');
  process.exit(1);
}

const targets = [
  {
    path: TAURI_CONF,
    label: 'tauri.conf.json',
    read: (text) => JSON.parse(text).version,
    write: (text) => {
      const conf = JSON.parse(text);
      conf.version = version;
      return JSON.stringify(conf, null, 2) + '\n';
    },
  },
  { path: CARGO_TOML, label: 'Cargo.toml', pattern: CARGO_TOML_VERSION },
  { path: CARGO_LOCK, label: 'Cargo.lock', pattern: CARGO_LOCK_VERSION },
];

const drifted = [];

for (const target of targets) {
  const text = readFileSync(target.path, 'utf8');
  let current;
  let next;

  if (target.pattern) {
    const match = text.match(target.pattern);
    if (!match) {
      console.error(`Could not find a version to sync in ${target.label}`);
      process.exit(1);
    }
    current = match[0].slice(match[1].length).replaceAll('"', '');
    next = text.replace(target.pattern, `$1"${version}"`);
  } else {
    current = target.read(text);
    next = target.write(text);
  }

  if (current === version) continue;

  drifted.push(`${target.label}: ${current} -> ${version}`);
  if (!check) writeFileSync(target.path, next);
}

if (!drifted.length) {
  console.log(`desktop version ${version} already in sync`);
  process.exit(0);
}

const detail = drifted.map((line) => `  ${line}`).join('\n');

if (check) {
  console.error(
    `desktop version files are out of sync with package.json (${version}):\n${detail}\n\nRun: pnpm -F desktop sync-version`,
  );
  process.exit(1);
}

console.log(`Synced desktop version to ${version}:\n${detail}`);
