---
description: Generate a changeset for pending changes — from a PR number, git diff vs a branch, or staged changes
---

## User Input

```text
$ARGUMENTS
```

## Goal

Analyze code changes and generate a well-written `.changeset/<slug>.md` file that accurately identifies which packages changed, the appropriate semver bump level, and a human-readable changelog summary suitable for end users (not just commit messages).

## Arguments

- **PR number** (e.g. `/changeset 104`) — analyze a merged or open GitHub PR
- **Branch** (e.g. `/changeset alpha`) — diff current branch vs the given branch
- **No argument** — diff current branch vs `main`, or fall back to staged changes

## Execution Steps

### 1. Determine the diff source

**If a PR number is provided:**
```bash
gh pr view <number> --json title,body,commits,files
gh pr diff <number>
```

**If a branch name is provided:**
```bash
git log <branch>..HEAD --pretty=format:"%h - %s" --no-merges
git diff <branch>...HEAD --stat
git diff <branch>...HEAD
```

**If no argument:**
```bash
git log origin/main..HEAD --pretty=format:"%h - %s" --no-merges
git diff origin/main...HEAD --stat
git diff origin/main...HEAD
```

### 2. Identify affected tracked packages

Check which workspace directories appear in the changed file paths. Only care about packages tracked by changesets (per `.changeset/config.json` — currently `cli`; `web`, `worker`, `shared` are ignored).

Map changed paths to packages:
- `cli/**` → `cli`
- `shared/**` → only if it ships a user-visible behavior change consumed by `cli`
- `web/**`, `worker/**` → ignored (not tracked)

If no tracked packages are affected, inform the user and exit — no changeset needed.

### 3. Determine semver bump level

Analyze the nature of the changes:

- **major** — breaking change to CLI commands, flags, or output format that would break existing scripts or integrations
- **minor** — new command, new flag, new capability, new output mode, new feature users can opt into
- **patch** — bug fix, performance improvement, dependency bump, internal refactor with no user-visible behavior change

When uncertain, lean `patch` for fixes and `minor` for new capabilities. Do NOT auto-select `major` — flag it and ask the user to confirm.

### 4. Generate the changelog summary

Write the summary as if addressing the end user of the `deadrop` CLI — not the maintainer. Good summaries:
- Lead with **what changed for the user**, not what files changed
- Use plain English, not jargon or internal naming
- Are 1–3 sentences max
- Focus on the "what" and "why", not the "how"

Bad: `Refactored esbuild.js and added bun-build.ts with nexe removal`
Good: `CLI binaries are now compiled with Bun for faster startup and smaller binary size across macOS, Linux, and Windows.`

### 5. Generate a slug

Create a short, kebab-case, human-readable filename that describes the change. Do NOT use random words. Examples:
- `cli-bun-binary-compilation`
- `vault-sync-fix`
- `inject-command`

### 6. Write the changeset file

```bash
cat > .changeset/<slug>.md << 'EOF'
---
'<package>': <bump>
---

<summary>
EOF
```

Show the generated file contents to the user before writing and ask for confirmation if the bump level is `major`.

### 7. Confirm

```bash
cat .changeset/<slug>.md
pnpm changeset status
```

Show the file and changeset status so the user can verify before committing.

## Output

Report the written file path and the resolved bump (`cli@<current> → <next>`). Remind the user to commit the `.changeset/` file with their PR.

## Example Usage

```
/changeset
```
Diffs current branch vs `main`, generates changeset.

```
/changeset 104
```
Analyzes PR #104, generates changeset.

```
/changeset alpha
```
Diffs current branch vs `alpha`.

## Notes

- Only packages listed in `.changeset/config.json` → `ignore` are excluded. Currently: `web`, `worker`, `shared`.
- If multiple tracked packages changed, the changeset can list all of them — changesets supports multiple package entries per file.
- Do NOT auto-commit the changeset. Leave that to the user so they can include it in the right PR.
- Do NOT use `changeset` CLI interactively — write the file directly so the summary can be high-quality prose rather than a one-liner typed in a prompt.
