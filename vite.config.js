import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import corsMiddleware from './server.js';

export default defineConfig({
  plugins: [
    react(),
    corsMiddleware()
  ],
  base: '/', // Required for correct routing on Vercel
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
  },
  server: {
    historyApiFallback: true, // Enables client-side routing for dev only
    allowedHosts: ['b904-72-253-113-239.ngrok-free.app']
  }
});