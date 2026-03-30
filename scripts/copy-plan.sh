#!/bin/sh
# Copies a plan doc matching the current branch into the worktree, if one exists.
# Called by wt post-create hook. Expects worktrunk template vars as env or args:
#   $1 = primary_worktree_path
#   $2 = worktree_path
#   $3 = sanitized branch name (/ replaced with -)

PRIMARY="$1"
WORKTREE="$2"
BRANCH="$3"

PLAN="$PRIMARY/docs/plans/$BRANCH.md"

if [ -f "$PLAN" ]; then
  mkdir -p "$WORKTREE/docs/plans"
  cp "$PLAN" "$WORKTREE/docs/plans/$BRANCH.md"
  echo "Copied plan: docs/plans/$BRANCH.md"
fi
