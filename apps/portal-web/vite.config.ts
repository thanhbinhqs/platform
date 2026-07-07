import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // ── Dev auth mock (temporary — removed when backend is live) ──
    {
      name: 'dev-auth-mock',
      configureServer(server) {
        server.middlewares.use('/api', (req, _res, next) => {
          if (!req.url) return next();
          // Only mock auth endpoints so the app stays usable
          if (req.url === '/v1/auth/me' && req.method === 'GET') {
            const token = req.headers.authorization?.replace('Bearer ', '') || '';
            if (!token) { _res.statusCode = 401; return _res.end(JSON.stringify({ message: 'Unauthorized' })); }
            return _res.end(JSON.stringify({
              data: {
                id: 1, username: 'admin', email: 'admin@platform.local',
                displayName: 'Admin', status: 'active',
                roles: [{ id: 1, name: 'admin', type: 'admin' }],
                permissions: ['read:rules','create:rules','update:rules','delete:rules','manage:users'],
                rules: [{ action: 'manage', subject: 'all' }],
                createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z',
              }
            }));
          }
          if (req.url === '/v1/auth/login' && req.method === 'POST') {
            return _res.end(JSON.stringify({
              data: {
                accessToken: 'dev-token',
                refreshToken: 'dev-refresh',
                user: {
                  id: 1, username: 'admin', email: 'admin@platform.local',
                  displayName: 'Admin', status: 'active',
                  roles: [{ id: 1, name: 'admin', type: 'admin' }],
                  permissions: ['read:rules','create:rules','update:rules','delete:rules','manage:users'],
                  rules: [{ action: 'manage', subject: 'all' }],
                  createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z',
                }
              }
            }));
          }
          next(); // non-auth → proxy to backend
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
