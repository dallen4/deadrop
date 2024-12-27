const PORT = process.env.PORT || 3000;

export const baseURL = process.env.TEST_URI || `http://localhost:${PORT}/`;

export const apiURL = process.env.DEADROP_API_URL!;
