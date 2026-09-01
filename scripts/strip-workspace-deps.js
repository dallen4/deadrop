// Workspace-protocol deps are build-time only: esbuild inlines `shared` into
// dist/deadrop.js, and the tarball ships nothing but dist/. Left in place,
// publishing rewrites `workspace:*` to a concrete version of whatever public
// package shares that name, so `npm i deadrop` fails to resolve it.

const WORKSPACE_PROTOCOL = 'workspace:';

const DEP_FIELDS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
];

// Returns a new manifest; never mutates the input.
function stripWorkspaceDeps(pkg) {
  const stripped = { ...pkg };
  const removed = [];

  for (const field of DEP_FIELDS) {
    const deps = pkg[field];
    if (!deps) continue;

    const kept = {};
    for (const [name, range] of Object.entries(deps)) {
      if (
        typeof range === 'string' &&
        range.startsWith(WORKSPACE_PROTOCOL)
      ) {
        removed.push(`${field}.${name}`);
      } else {
        kept[name] = range;
      }
    }

    // Drop the field entirely rather than publishing an empty object.
    if (Object.keys(kept).length) stripped[field] = kept;
    else delete stripped[field];
  }

  return { pkg: stripped, removed };
}

module.exports = { stripWorkspaceDeps };
