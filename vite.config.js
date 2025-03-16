import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: './postcss.config.js',
  },
  server: {
    host: true,
    strictPort: true,
    allowedHosts: [
      'c046-2603-800c-2a00-c0bf-a513-1070-60f7-b308.ngrok-free.app'
    ]
  },
  assetsInclude: ['**/*.html'], // Keep this if you need HTML files as assets, but we’ll handle entry points separately
  build: {
    outDir: 'dist', // Ensure output goes to dist/
    assetsDir: 'assets', // Keep assets in a separate folder
    rollupOptions: {
      input: 'index.html', // Explicitly set index.html as the entry point
    },
  },
});
