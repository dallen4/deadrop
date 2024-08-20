#!/bin/bash

npx replace '"private": true' '"private": false' ./package.json
npx replace '"name": "cli"' '"name": "deadrop"' ./package.json
