import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // ── Dev auth mock (proxies auth to real backend for real JWT) ──
    {
      name: 'dev-auth-mock',
      configureServer(server) {
        server.middlewares.use('/api', async (req, _res, next) => {
          if (!req.url) return next();
          // Proxy auth endpoints to real backend
          if (req.url === '/v1/auth/login' && req.method === 'POST') {
            const chunks: Buffer[] = [];
            req.on('data', (c: Buffer) => chunks.push(c));
            req.on('end', async () => {
              try {
                const body = JSON.parse(Buffer.concat(chunks).toString());
                const r = await fetch('http://localhost:3000/api/v1/auth/login', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(body),
                });
                const json = await r.json();
                _res.setHeader('Content-Type', 'application/json');
                if (!r.ok) { _res.statusCode = r.status; return _res.end(JSON.stringify(json)); }
                return _res.end(JSON.stringify(json));
              } catch (e) {
                _res.statusCode = 500;
                return _res.end(JSON.stringify({ message: 'Auth proxy failed' }));
              }
            });
            return;
          }
          // Proxy /auth/me through to real backend with the real token
          if ((req.url === '/v1/auth/me' || req.url === '/v1/auth/me/') && req.method === 'GET') {
            const r = await fetch('http://localhost:3000/api/v1/auth/me', {
              headers: { 'Authorization': req.headers.authorization || '' },
            });
            const json = await r.json();
            _res.setHeader('Content-Type', 'application/json');
            if (!r.ok) { _res.statusCode = r.status; return _res.end(JSON.stringify(json)); }
            return _res.end(JSON.stringify(json));
          }
          next(); // non-auth → proxy to backend via Vite
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
