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

Only packages that ship externally are tracked. Per `.changeset/config.json`:

- **Tracked**: `cli` (publishes to npm as `deadrop`)
- **Ignored**: `web`, `worker`, `shared` — internal/deployable workspaces that don't publish to a registry

When `vscode-extension` lands in this repo, remove it from the `ignore` list and add it as a tracked package.

## Useful commands

```bash
pnpm changeset            # Create a new changeset (interactive)
pnpm changeset:version    # Consume changesets and bump versions (CI runs this)
pnpm changeset status     # Show pending changesets
```
