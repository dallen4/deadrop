---
description: Create a commit from staged files using conventional commit patterns
---

## User Input

```text
$ARGUMENTS
```

## Goal

Create a conventional commit with an appropriate type prefix and succinct message based on staged changes, following the repository's commit message patterns.

## Arguments

- **context** (optional): Additional context, keywords, or focus areas to incorporate into the auto-generated commit message. This informs the message generation rather than replacing it.

## Execution Steps

### 1. Verify Staged Changes

Check that there are staged files to commit:

```bash
git diff --cached --name-only
```

If no files are staged, inform the user and exit.

### 2. Analyze Staged Changes

Get detailed diff statistics:

```bash
git diff --cached --stat
```

Get the actual changes:

```bash
git diff --cached
```

### 3. Review Recent Commits

View last 10 commits to understand the repo's commit style:

```bash
git log --oneline -10
```

### 4. Generate Commit Message

Analyze the staged changes and generate a conventional commit message following these patterns.

If the user provided context via arguments, incorporate that context into the message generation (e.g., emphasizing certain aspects, using their terminology, or focusing on what they mentioned).

**Conventional Commit Types:**
- `feat:` - New feature or enhancement
- `fix:` - Bug fix
- `chore:` - Maintenance, dependencies, or config updates
- `refactor:` - Code restructuring without functionality changes
- `docs:` - Documentation changes
- `test:` - Test additions or updates
- `style:` - Code style/formatting changes

**Message Guidelines:**
- Keep it succinct (under 72 characters if possible)
- Use imperative mood ("add" not "added" or "adds")
- No period at the end
- Focus on the "what" and "why", not the "how"

**Examples from this repo:**
- `feat: add track navigation & improve stream URL support`
- `fix: troubleshoot track autoplay on next`
- `chore: update CLAUDE.md file`
- `fix: disable caching on admin pages for real-time updates`

### 5. Create Commit

Create commit with the generated message:

```bash
git commit -m "<type>: <succinct_description>"
```

**IMPORTANT**: Do NOT add "🤖 Generated with Claude Code" or "Co-Authored-By" trailers to the commit message. Keep commits clean and succinct.

### 6. Confirm Success

Show the created commit:

```bash
git log -1 --oneline
```

## Output

Return a brief confirmation with the commit hash and message to the user.

## Example Usage

```
/commit
```

Auto-generates a commit message based on staged changes.

```
/commit spacebar play/pause
```

Auto-generates a commit incorporating "spacebar play/pause" context (e.g., might generate "feat: add spacebar play/pause to player").

```
/commit keyboard shortcuts
```

Auto-generates with focus on keyboard shortcuts aspect.

## Notes

- Ensure files are staged (`git add`) before running this command
- Messages should follow conventional commit format
- Keep messages concise and focused on what changed, not how
- The command will abort if no files are staged
