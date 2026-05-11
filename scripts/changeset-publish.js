#!/usr/bin/env node

// Changesets uses the `name` field for npm version checks and tag creation.
// Since our workspace is named "cli" but publishes as "deadrop", we patch the
// name before changeset publish runs, then restore it after.

const fs = require('fs');
const { execSync } = require('child_process');

const pkgPath = 'cli/package.json';
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

pkg.name = 'deadrop';
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

try {
    execSync('changeset publish', { stdio: 'inherit' });
} finally {
    pkg.name = 'cli';
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}
