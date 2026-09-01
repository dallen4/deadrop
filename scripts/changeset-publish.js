#!/usr/bin/env node

// Patches the manifest for publish (name -> "deadrop", workspace deps stripped) and leaves it patched — changesets/action reads this file again after we exit to resolve publishedPackages, and release.yml restores it via `git checkout` once that's done.

const fs = require('fs');
const { execSync } = require('child_process');
const { stripWorkspaceDeps } = require('./strip-workspace-deps');

const pkgPath = 'cli/package.json';
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

pkg.name = 'deadrop';

// `shared` stays a real dependency in the repo so a shared-only changeset still
// cascades a version bump to cli — it's bundled into the artifact, so cli has to
// republish. It just can't survive into the published manifest.
const { pkg: publishPkg, removed } = stripWorkspaceDeps(pkg);
if (removed.length)
  console.log(`stripped workspace deps: ${removed.join(', ')}`);

fs.writeFileSync(pkgPath, JSON.stringify(publishPkg, null, 2) + '\n');

execSync('changeset publish', { stdio: 'inherit' });
