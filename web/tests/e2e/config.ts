const PORT = process.env.PORT || 3000;

export const baseURL =
  process.env.TEST_URI || `http://localhost:${PORT}/`;

export const isLocal = baseURL.includes('localhost');

export const apiURL = process.env.DEADROP_API_URL!;

export const isPreviewEnv = process.env.STAGE === 'Preview';
