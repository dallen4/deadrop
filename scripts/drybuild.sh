#!/bin/sh

# build CLI
yarn cli:build

# dry run of deploy compilation worker
yarn worker:deploy -- --dry-run

# build web app asssets
yarn build
