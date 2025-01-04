/* eslint-disable @typescript-eslint/no-var-requires */
import { captureException } from '@sentry/react';

export const reportError = (err: Error) =>
  captureException(err, {
    contexts: {
      app: {
        app_version: require('../../package.json').version,
      },
    },
  });
