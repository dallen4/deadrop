#!/bin/sh

# build CLI
pnpm cli:build

# dry run of deploy compilation worker
pnpm worker:deploy --dry-run

# build web app asssets
pnpm build
