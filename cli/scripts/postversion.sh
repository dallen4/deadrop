#!/bin/bash

VERSION=$(jq -r .version < package.json)

git commit -m "chore: bump version to $VERSION"

git push --follow-tags
