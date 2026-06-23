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

// Single source of truth for whether the Clerk/Stripe auth specs run.
// They only run where a stable custom domain makes Clerk reliable
// (RUN_AUTH_TESTS, set by CI on alpha/main). `SKIP_AUTH_TESTS` is a hard
// kill switch to short-circuit every auth test regardless of branch — set
// it to get a fast, Clerk-free drop-flow run across all engines.
export const runAuthTests =
  !!process.env.RUN_AUTH_TESTS && !process.env.SKIP_AUTH_TESTS;

// begin-drop's WebRTC peer init is slow on Mobile Safari (WebKit); use for the
// post-begin-drop visibility waits.
export const peerInitVisible = { timeout: 20_000 };
