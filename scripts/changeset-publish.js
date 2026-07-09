#!/usr/bin/env node

// Patches the name to "deadrop" for publish and leaves it patched — changesets/action reads this file again after we exit to resolve publishedPackages, and release.yml restores it via `git checkout` once that's done.

const fs = require('fs');
const { execSync } = require('child_process');

const pkgPath = 'cli/package.json';
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

pkg.name = 'deadrop';
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

execSync('changeset publish', { stdio: 'inherit' });
