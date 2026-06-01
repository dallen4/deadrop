import path from 'path';

const PORT = process.env.PORT || 3000;

// Where the global setup saves the signed-in Clerk session. Auth specs load
// this via `test.use({ storageState: authFile })` so they start already
// authenticated — no per-test sign-in (which bot-detection would block).
export const authFile = path.join(
  __dirname,
  '.clerk',
  'user.json',
);

const rawBaseURL =
  process.env.TEST_URI || `http://localhost:${PORT}/`;

export const baseURL = rawBaseURL.endsWith('/')
  ? rawBaseURL
  : `${rawBaseURL}/`;

export const isLocal = baseURL.includes('localhost');

export const apiURL = process.env.DEADROP_API_URL!;

export const isPreviewEnv = process.env.STAGE === 'Preview';
