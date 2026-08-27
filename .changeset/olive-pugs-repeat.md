---
'cli': patch
---

Fix `npm install deadrop` failing with `ETARGET No matching version found for shared@1.2.0`.

The private `shared` workspace package was declared in `dependencies`, so publishing rewrote `workspace:*` into a concrete version of an unrelated public package named `shared`. It is now stripped from the manifest at publish time, alongside the existing `cli` to `deadrop` rename. `shared` stays a real dependency in the repo so a shared-only change still cascades a version bump to the CLI, which is required because esbuild bundles it into the published artifact.
