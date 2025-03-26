import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        console.log(`[Middleware] Processing request: ${req.url}`);
        if (req.url.startsWith('/api/')) {
          const urlParts = req.url.split('/').filter(Boolean);
          console.log(`[Middleware] URL Parts:`, urlParts);
          try {
            if (urlParts[1] === 'serve-ad' && urlParts[2]) {
              console.log(`[Middleware] Handling serve-ad for listingId: ${urlParts[2]}`);
              import('./api/serve-ad/[listingId].js').then(module => {
                const handler = module.default;
                req.params = { listingId: urlParts[2].split('?')[0] };
                handler(req, res);
              }).catch(error => {
                console.error(`[Middleware] Error loading serve-ad handler:`, error);
                res.statusCode = 500;
                res.end('<h1>500 - Internal Server Error</h1><p>Error processing request.</p>');
              });
            } else if (urlParts[1] === 'track-impression') {
              import('./api/track-impression.js').then(module => {
                const handler = module.default;
                handler(req, res);
              }).catch(error => {
                console.error(`[Middleware] Error loading track-impression handler:`, error);
                res.statusCode = 500;
                res.end('<h1>500 - Internal Server Error</h1><p>Error processing request.</p>');
              });
            } else if (urlParts[1] === 'track-click') {
              import('./api/track-click.js').then(module => {
                const handler = module.default;
                handler(req, res);
              }).catch(error => {
                console.error(`[Middleware] Error loading track-click handler:`, error);
                res.statusCode = 500;
                res.end('<h1>500 - Internal Server Error</h1><p>Error processing request.</p>');
              });
            } else {
              console.log(`[Middleware] No handler for ${req.url}, passing to next`);
              next();
            }
          } catch (error) {
            console.error(`[Middleware] Error handling ${req.url}:`, error);
            res.statusCode = 500;
            res.end('<h1>500 - Internal Server Error</h1><p>Error processing request.</p>');
          }
        } else {
          next();
        }
      });
    },
  },
});