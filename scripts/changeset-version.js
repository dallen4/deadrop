#!/usr/bin/env node

// Wraps `changeset version` to also sync versions that changesets
// doesn't manage: the root workspace and vscode-extension.
//
// Root version mirrors the cli version (the primary published package).
// vscode-extension is bumped independently — add it to the changeset
// frontmatter as "deadrop-vsc" with the desired bump level.

const fs = require('fs');
const { execSync } = require('child_process');

const ROOT_PKG = 'package.json';
const VSCODE_PKG = 'vscode-extension/package.json';
const CLI_PKG = 'cli/package.json';
const CHANGESET_DIR = '.changeset';

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function writeJson(path, obj) {
  fs.writeFileSync(path, JSON.stringify(obj, null, 2) + '\n');
}

// Parse pending changesets for a vscode-extension bump
function getVscodeBump() {
  const files = fs.readdirSync(CHANGESET_DIR).filter(
    (f) => f.endsWith('.md') && f !== 'README.md'
  );

  for (const file of files) {
    const content = fs.readFileSync(
      `${CHANGESET_DIR}/${file}`,
      'utf8'
    );
    const match = content.match(
      /["']deadrop-vsc["']\s*:\s*(major|minor|patch)/
    );
    if (match) return match[1];
  }
  return null;
}

function bumpVersion(current, level) {
  const [major, minor, patch] = current.split('.').map(Number);
  switch (level) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(`Unknown bump level: ${level}`);
  }
}

// 1. Check for vscode bump before changesets consumes the files
const vscodeBump = getVscodeBump();

// 2. Strip vscode entries from changesets (it can't resolve the package)
if (vscodeBump) {
  const files = fs.readdirSync(CHANGESET_DIR).filter(
    (f) => f.endsWith('.md') && f !== 'README.md'
  );

  for (const file of files) {
    const path = `${CHANGESET_DIR}/${file}`;
    const content = fs.readFileSync(path, 'utf8');
    if (content.includes('deadrop-vsc')) {
      const cleaned = content.replace(
        /["']deadrop-vsc["']\s*:\s*(major|minor|patch)\n?/,
        ''
      );
      fs.writeFileSync(path, cleaned);
    }
  }
}

// 3. Run changeset version
execSync('changeset version', { stdio: 'inherit' });

// 4. Sync root version to match cli
const cliVersion = readJson(CLI_PKG).version;
const rootPkg = readJson(ROOT_PKG);
if (rootPkg.version !== cliVersion) {
  rootPkg.version = cliVersion;
  writeJson(ROOT_PKG, rootPkg);
  console.log(`Root version synced to ${cliVersion}`);
}

// 5. Bump vscode-extension if a changeset requested it
if (vscodeBump) {
  const vscodePkg = readJson(VSCODE_PKG);
  const newVersion = bumpVersion(vscodePkg.version, vscodeBump);
  vscodePkg.version = newVersion;
  writeJson(VSCODE_PKG, vscodePkg);
  console.log(
    `vscode-extension bumped ${vscodeBump}: ${newVersion}`
  );
}
