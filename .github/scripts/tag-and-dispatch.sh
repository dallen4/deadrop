#!/usr/bin/env bash
# Tags + pushes the given ref, then explicitly dispatches a workflow for it.
#
# A tag pushed with the default GITHUB_TOKEN does NOT trigger other
# workflows' `on: push: tags` listeners (GitHub's anti-recursion
# protection), so release.yml can't just push a tag and rely on
# cli_publish_workflow.yml / desktop_publish_workflow.yml picking it up —
# it has to dispatch them explicitly once the tag is visible on origin.
set -euo pipefail

tag="$1"
workflow="$2"

git tag "$tag" 2>/dev/null || true
git push origin "refs/tags/$tag" 2>/dev/null || true

for i in $(seq 1 10); do
  if gh api "repos/${GITHUB_REPOSITORY}/git/ref/tags/$tag" >/dev/null 2>&1; then
    break
  fi
  echo "waiting for $tag to appear on origin ($i)..."
  sleep 3
done

echo "Dispatching $workflow for $tag"
gh workflow run "$workflow" --ref "$tag"
