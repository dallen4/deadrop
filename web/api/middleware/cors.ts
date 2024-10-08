import Cors from 'cors';

export const cors = Cors({
  methods: ['POST', 'GET', 'DELETE'],
  origin: (origin, callback) => {
    if (
      !origin ||
      origin.endsWith('deadrop.io') ||
      origin.endsWith('nieky-allens-projects.vercel.app') ||
      origin.endsWith('nieky.vercel.app') ||
      origin.includes('vscode-webview:')
    )
      callback(null, true);
    else if (
      process.env.NODE_ENV !== 'production' &&
      origin.startsWith('http://localhost:')
    )
      callback(null, true);
    else {
      console.log(`Invalid origin: ${origin}`);
      callback(new Error('Invalid origin'));
    }
  },
});
