---
description: Cut a release — create changesets, toggle config, and prep for the CI release workflow
---

## User Input

```text
$ARGUMENTS
```

## Goal

Prepare a release by creating a changeset file, adjusting the changeset config, and staging everything for the `release.yml` CI workflow. Never bump versions locally — CI handles that via `scripts/changeset-version.js`.

## Arguments

- **No argument** — analyze diff vs `main` and prompt for bump levels per package
- **Version** (e.g. `/release 1.0.0`) — set all tracked packages to that version (infers bump level from current versions)
- **Bump level** (e.g. `/release patch`) — apply the same bump level to all affected packages

## Execution Steps

### 1. Determine what changed

```bash
git log origin/main..HEAD --pretty=format:"%h - %s" --no-merges
```

Group commits by workspace directory to identify affected packages:
- `shared/**` → `shared`
- `web/**` → `web`
- `worker/**` → `worker`
- `cli/**` → `cli`
- `vscode-extension/**` → `deadrop-vsc`
- `tests/**` → cross-platform e2e (mention in changelog body, not a separate package)

### 2. Determine bump levels

If the user provided a version or bump level, use that. Otherwise, analyze changes per package:

- **major** — breaking changes to public APIs, CLI command signatures, or protocol changes
- **minor** — new features, new commands, new UI capabilities
- **patch** — bug fixes, internal refactors, dependency bumps

Present the proposed bumps to the user for confirmation before proceeding.

### 3. Update changeset config

Read `.changeset/config.json`. If any of `web`, `worker`, `shared` are in the `ignore` array and are being bumped, temporarily clear the ignore list:

```json
"ignore": []
```

This lets the CI workflow bump all packages. The ignore list is restored after the release PR merges.

### 4. Create the changeset file

Write `.changeset/<slug>.md` with:
- YAML frontmatter listing each package and its bump level
- `"deadrop-vsc": <level>` if vscode-extension has changes (the custom version script handles this separately since `@manypkg` can't resolve it)
- Body with per-package changelog sections (### Shared, ### Web, etc.)
- Changelog entries should describe user-facing changes, not commit messages

### 5. Verify

```bash
pnpm changeset:status
```

Show the changeset file contents and status to the user.

### 6. Stage files

Do NOT commit. Stage the files and show the user what's ready:

```bash
git add .changeset/ package.json
git status
```

Remind the user:
1. Commit and push to `main` (or merge a PR to `main`)
2. The `release.yml` workflow will open a "Version Packages" PR
3. Review and merge that PR to trigger publish
4. After the release PR merges, restore `"ignore": ["web", "worker", "shared"]` in `.changeset/config.json`

## How the release workflow works

1. **Push to main with pending changesets** → `release.yml` runs `changesets/action` which opens a "Version Packages" PR
2. **The PR runs `pnpm changeset:version`** → calls `scripts/changeset-version.js`:
   - Parses any `"deadrop-vsc"` entries from changesets and strips them (so `changeset version` doesn't choke)
   - Runs `changeset version` (bumps cli/web/shared/worker, generates CHANGELOGs)
   - Syncs root `package.json` version to match cli
   - Bumps `vscode-extension/package.json` if a changeset included `"deadrop-vsc"`
3. **Merging the Version Packages PR** → `changeset publish`:
   - `scripts/changeset-publish.js` patches `cli/package.json` name to `deadrop` for npm
   - Publishes `deadrop@<version>` to npm
   - Creates `deadrop@<version>` git tag
4. **The tag triggers `cli_publish_workflow.yml`** → cross-platform binary compilation + GitHub Release

## Tagging conventions

- `deadrop@X.Y.Z` — CLI npm release (created automatically by changesets)
- `vX.Y.Z` — monorepo milestone tags (manual, optional)
- `deadrop-vsc@X.Y.Z` — vscode extension marketplace (manual)

## Notes

- Never run `changeset version` locally except to test the script — CI does this
- The `changeset:version` script in `package.json` points to `scripts/changeset-version.js`, not bare `changeset version`
- `vscode-extension` is invisible to changesets' `@manypkg` resolver — the custom version script is the only way to bump it via this flow
- Root `package.json` version always mirrors cli — the version script handles this automatically
