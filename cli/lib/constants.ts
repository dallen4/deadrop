
export const DEADROP_URL =
  process.env.DEADROP_APP_URL || 'http://localhost:3000';

export const LOGIN_URL = `${DEADROP_URL}/auth/cli`;

export const LOCALHOST_AUTH_PORT = 1337;

export const LOCALHOST_AUTH_URL = `http://localhost:${LOCALHOST_AUTH_PORT}`;
