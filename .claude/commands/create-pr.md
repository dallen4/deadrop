---
description: Create a pull request from current branch to target branch with comprehensive summary
---

## User Input

```text
$ARGUMENTS
```

## Goal

Create a comprehensive pull request using GitHub CLI by analyzing commits between branches, recent PR history, and generating a detailed summary.

## Arguments

- **target_branch** (optional): The base branch to merge into. Defaults to `test` if not specified.

## Execution Steps

### 1. Parse Arguments

Extract the target branch from arguments, default to `test` if not provided.

### 2. Get Repository Context

```bash
gh repo view --json nameWithOwner -q .nameWithOwner
```

### 3. Analyze Commit Differences

Get all commits on current branch that aren't on target branch:

```bash
git log <target_branch>..<current_branch> --pretty=format:"%h - %s" --no-merges
```

Get diff statistics:

```bash
git diff <target_branch>...<current_branch> --stat
```

### 4. Review Recent PR History

Fetch last 5 merged PRs for context on PR format:

```bash
gh pr list --limit 5 --state merged --json number,title,body,mergedAt
```

### 5. Generate PR Summary

Based on the commit messages and diff stats, create a structured PR body with:

- **Summary**: High-level overview of changes (2-3 sentences)
- **Changes**: Organized by feature/fix with commit references
  - Group related commits together
  - Include specific component/file changes
  - Reference commit SHAs for traceability
- **Testing Checklist**: Actionable items based on the changes

### 6. Create Pull Request

```bash
gh pr create --base <target_branch> --head <current_branch> --title "<generated_title>" --body "<generated_body>"
```

**IMPORTANT**: Do NOT include "Co-Authored-By" or "Generated with Claude Code" clauses in the PR body.

## Output

Return the created PR URL to the user.

## Example Usage

```
/create-pr
```

Creates PR from current branch to `test`.

```
/create-pr main
```

Creates PR from current branch to `main`.

## Notes

- Ensure you're on the correct source branch before running
- The command analyzes all commits between branches to generate accurate summaries
- PR title and body are auto-generated based on commit analysis
- Follows existing PR format patterns from repository history
