# Changesets

This directory holds [changesets](https://github.com/changesets/changesets) — markdown files describing intent-to-release changes. Each changeset records which packages it affects and the semver bump level (`patch` / `minor` / `major`).

## Usage

When you make a change that should be released, add a changeset:

```bash
pnpm changeset
```

Pick the affected packages, the bump level, and write a short summary. Commit the generated `.changeset/<random>.md` file along with your code changes.

When changesets are merged into `main`, the release workflow opens (or updates) a **"Version Packages"** pull request that consumes pending changesets, bumps the affected `package.json` versions, regenerates `CHANGELOG.md` files, and deletes the consumed changeset files. Merging that release PR cuts the release: it commits the version bumps and pushes the tag(s) that trigger downstream publish workflows.

## Scope in this monorepo

Every publishable/deployable workspace is tracked independently: `cli` (npm), `vscode-extension` (VS Code marketplace), `web` (Vercel), `worker` (Cloudflare), and `shared`. Only `tests` is ignored — it never publishes or deploys.

There's no `fixed`/`linked` grouping. Packages that declare `"shared": "workspace:*"` as a real dependency (currently `cli`, `web`, `worker`, `vscode-extension`) get an automatic patch bump whenever a changeset touches `shared`, via `updateInternalDependencies: "patch"`. A package only bumps when it — or something it depends on — actually changed. To bump several packages together deliberately (e.g. a joint release), just list them all in one changeset.

## Useful commands

```bash
pnpm changeset            # Create a new changeset (interactive)
pnpm changeset:version    # Consume changesets and bump versions (CI runs this)
pnpm changeset status     # Show pending changesets
```
