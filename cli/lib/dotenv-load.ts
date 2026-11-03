import { loadDotenv } from './dotenv';

// Side-effect import so it runs before modules that read the env.
loadDotenv();
