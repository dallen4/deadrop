import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  root: 'views',
  build: {
    outDir: '../views/dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, 'views/index.html'),
        vault: path.resolve(__dirname, 'views/vault.html'),
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name]-chunk.js',
        assetFileNames: (info) => {
          if (info.name === 'src.css') return 'assets/index.css';
          return 'assets/[name][extname]';
        },
      },
    },
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
      '@ext': path.resolve(__dirname, 'src'),
    },
  },
  plugins: [react()],
});
