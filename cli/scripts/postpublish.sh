#!/bin/bash

npx replace '"private": false' '"private": true' ./package.json
npx replace '"name": "deadrop"' '"name": "cli"' ./package.json
