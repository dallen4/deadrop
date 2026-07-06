---
description: Cut a release — create changesets and prep for the CI release workflow
---

## User Input

```text
$ARGUMENTS
```

## Goal

Prepare a release by creating a changeset file and staging everything for the `release.yml` CI workflow. Never bump versions locally — CI handles that via `changeset version` directly.

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
- `tests/**` → cross-platform e2e (mention in changelog body — `tests` is `ignore`d in `.changeset/config.json`, never versioned)

### 2. Determine bump levels

If the user provided a version or bump level, use that. Otherwise, analyze changes per package:

- **major** — breaking changes to public APIs, CLI command signatures, or protocol changes
- **minor** — new features, new commands, new UI capabilities
- **patch** — bug fixes, internal refactors, dependency bumps

Packages that declare `"shared": "workspace:*"` as a real dependency (`cli`, `web`, `worker`, `vscode-extension`) get an automatic patch bump whenever `shared` bumps, via `updateInternalDependencies: "patch"` — don't manually add a `shared`-triggered patch entry for those unless you want a *higher* bump than the cascade would give.

There is no `fixed`/`linked` group — packages only bump when explicitly listed in a changeset or pulled in by the dependency cascade above. To ship several packages together deliberately (a joint "platform" release), list them all with matching bump levels in one changeset.

Present the proposed bumps to the user for confirmation before proceeding.

### 3. Create the changeset file

Write `.changeset/<slug>.md` with:
- YAML frontmatter listing each package and its bump level (`cli`, `web`, `worker`, `shared`, `deadrop-vsc` — all are normally-tracked changesets packages)
- Body with per-package changelog sections (### Shared, ### Web, etc.)
- Changelog entries should describe user-facing changes, not commit messages

### 4. Verify

```bash
pnpm changeset:status
```

Show the changeset file contents and status to the user.

### 5. Stage files

Do NOT commit. Stage the files and show the user what's ready:

```bash
git add .changeset/
git status
```

Remind the user:
1. Commit and push to `main` (or merge a PR to `main`)
2. The `release.yml` workflow will open a "Version Packages" PR
3. Review and merge that PR to trigger publish

## How the release workflow works

1. **Push to main with pending changesets** → `release.yml` runs `changesets/action` which opens a "Version Packages" PR
2. **The PR runs `pnpm changeset:version`** → calls `changeset version` directly:
   - Bumps every affected package (including `deadrop-vsc`, now a normally-tracked package) and generates CHANGELOGs
   - Root `package.json`'s version is untouched — it isn't a changesets-tracked package and nothing reads it anymore (`web/lib/sentry.ts` reads web's own version)
3. **Merging the Version Packages PR** → `changeset publish`:
   - `scripts/changeset-publish.js` patches `cli/package.json` name to `deadrop` for npm (genuine name mismatch — `cli` workspace, `deadrop` npm package)
   - `vscode-extension` is `"private": true`, so `changeset publish` skips it — no accidental npm publish. Its real release path is manual: `pnpm vscode:publish` (`vsce publish`)
   - Publishes `deadrop@<version>` to npm
   - Creates `deadrop@<version>` git tag
4. **The tag triggers `cli_publish_workflow.yml`** → cross-platform binary compilation + GitHub Release

## Tagging conventions

- `deadrop@X.Y.Z` — CLI npm release (created automatically by changesets)
- `vX.Y.Z` — monorepo milestone tags (manual, optional)
- `deadrop-vsc@X.Y.Z` — vscode extension marketplace (manual)

## Notes

- Never run `changeset version` locally except to test — CI does this
- `web`, `worker`, `shared` are `"private": true` — changesets bumps and changelogs them but never attempts `npm publish` for them (they deploy via Vercel/Cloudflare, not npm)
- `vscode-extension` is `"private": true` for the same reason — its marketplace publish is a separate manual step (`pnpm vscode:publish`), not part of `changeset publish`
