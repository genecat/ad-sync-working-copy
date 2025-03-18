import { defineConfig } from 'vite';
import { createServer } from 'vite';

export default defineConfig({
  server: {
    middleware: async (app) => {
      app.use((req, res, next) => {
        if (req.url.startsWith('/api/')) {
          const urlParts = req.url.split('/');
          if (urlParts[2] === 'test' || urlParts[2].startsWith('serve-campaign')) {
            const handlerModule = urlParts[2] === 'test' ? './api/test.js' : `./api/${urlParts[2]}/[campaignId].js`;
            try {
              const handler = require(handlerModule).default;
              handler(req, res);
            } catch (error) {
              console.error(`Error handling ${req.url}:`, error);
              res.statusCode = 500;
              res.end('<h1 style="font-family: Arial; text-align: center; margin-top: 50px;">500 - Internal Server Error</h1>' +
                      '<p style="text-align: center;">Error processing request.</p>');
            }
          } else {
            next();
          }
        } else {
          next();
        }
      });
    },
  },
});
