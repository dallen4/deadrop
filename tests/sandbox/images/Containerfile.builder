# Plays the ubuntu-24.04-arm runner from cli_publish_workflow.yml. The only
# image here with a toolchain — targets stay bare.
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive HUSKY=0

RUN apt-get update && apt-get install -y --no-install-recommends \
      bash ca-certificates curl git unzip xz-utils python3 build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable

RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

WORKDIR /build

# Manifests only, so the dependency layer is keyed on the lockfile. Source
# arrives at run time via tar, which adds without deleting.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY cli/package.json cli/
COPY shared/package.json shared/
COPY worker/package.json worker/
COPY web/package.json web/
COPY desktop/package.json desktop/
COPY vscode-extension/package.json vscode-extension/
COPY tests/package.json tests/

RUN pnpm install --frozen-lockfile --filter cli...
