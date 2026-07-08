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

          // Resolve JSON body or text.
          const resolveBody = async (r: Response) => {
            const ct = r.headers.get('content-type') || '';
            if (ct.includes('json')) return r.json();
            const txt = await r.text();
            try { return JSON.parse(txt); } catch { return { message: txt.slice(0, 500) }; }
          };

          try {
            // Proxy /login to real backend
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
                  const json = await resolveBody(r);
                  _res.setHeader('Content-Type', 'application/json');
                  _res.statusCode = r.ok ? 200 : r.status;
                  return _res.end(JSON.stringify(json));
                } catch (e) {
                  _res.statusCode = 502;
                  return _res.end(JSON.stringify({ message: 'Auth proxy error', error: '' + (e as Error).message }));
                }
              });
              return;
            }

            // Proxy /auth/me to real backend with the token from the client
            if ((req.url === '/v1/auth/me' || req.url === '/v1/auth/me/') && req.method === 'GET') {
              const r = await fetch('http://localhost:3000/api/v1/auth/me', {
                headers: { 'Authorization': req.headers.authorization || '' },
              });
              const json = await resolveBody(r);
              _res.setHeader('Content-Type', 'application/json');
              _res.statusCode = r.ok ? 200 : r.status;
              return _res.end(JSON.stringify(json));
            }
          } catch (e) {
            _res.statusCode = 502;
            _res.setHeader('Content-Type', 'application/json');
            return _res.end(JSON.stringify({ message: 'Auth proxy error', error: '' + (e as Error).message }));
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
