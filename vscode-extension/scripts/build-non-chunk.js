#!/usr/bin/env node
// from: https://github.com/rebornix/vscode-webview-react/blob/master/scripts/build-non-split.js
// Disables code splitting into chunks
// See https://github.com/facebook/create-react-app/issues/5306#issuecomment-433425838

const path = require('path');
const rewire = require('rewire');
const defaults = rewire('react-scripts/scripts/build.js');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

let config = defaults.__get__('config');

config.resolve = {
    ...config.resolve,
    extensions: ['.ts', '.tsx', '.js'],
    plugins: [
        new TsconfigPathsPlugin({ configFile: './tsconfig.json' }),
    ],
    fallback: {
        crypto: false,
    },
};

config.module = {
    ...config.module,
    rules: [
        {
            test: /\.(ts|tsx)$/,
            exclude: /node_modules/,
            use: [
                {
                    loader: 'ts-loader',
                    options: {
                        compilerOptions: {
                            module: 'es2022',
                        },
                    },
                },
            ],
        },
        ...config.module.rules,
    ],
};

config.optimization.splitChunks = {
    cacheGroups: {
        default: false,
    },
};

config.optimization.runtimeChunk = false;
