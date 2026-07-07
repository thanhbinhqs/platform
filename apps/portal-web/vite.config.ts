import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // ── Mock API for development ──
    {
      name: 'mock-api',
      configureServer(server) {
        server.middlewares.use('/api', (req, res, next) => {
          // Only handle JSON API requests
          if (!req.url || !req.url.startsWith('/v1/')) return next();

          res.setHeader('Content-Type', 'application/json');
          const url = req.url;

          // GET /auth/me
          if (url === '/v1/auth/me' && req.method === 'GET') {
            return res.end(JSON.stringify({
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

          // POST /auth/login
          if (url === '/v1/auth/login' && req.method === 'POST') {
            return res.end(JSON.stringify({
              data: {
                accessToken: 'mock-token',
                refreshToken: 'mock-refresh',
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

          // Generic paginated endpoints (rules, users, roles, permissions, audit-logs, dashboard)
          if (url.startsWith('/v1/rules')) {
            const params = new URL(url, 'http://localhost').searchParams;
            const page = Math.max(1, parseInt(params.get('page') || '1'));
            const limit = Math.min(100, Math.max(1, parseInt(params.get('limit') || '20')));
            const name = params.get('name') || '';
            const event = params.get('event') || '';
            const status = params.get('status') || '';
            const priority = params.get('priority') || '';
            const createdAtFrom = params.get('createdAt_from') || '';
            const createdAtTo = params.get('createdAt_to') || '';
            const sortBy = params.get('sortBy') || 'id';
            const sortOrder = params.get('sortOrder') || 'asc';

            const allRules = [
              { id: 1, name: 'Auto-approve low-value claims', event: 'claim.submitted', status: 'active', priority: 'high', description: 'Auto-approve claims under $500', createdBy: 'admin', createdAt: '2025-06-01T08:00:00Z', updatedAt: '2025-06-15T10:30:00Z' },
              { id: 2, name: 'Flag high-risk transactions', event: 'transaction.created', status: 'active', priority: 'urgent', description: 'Flag transactions > $10,000 from new accounts', createdBy: 'admin', createdAt: '2025-05-20T14:00:00Z', updatedAt: '2025-06-10T09:00:00Z' },
              { id: 3, name: 'MFA required for admin actions', event: 'admin.action', status: 'active', priority: 'critical', description: 'Require MFA verification for sensitive admin operations', createdBy: 'system', createdAt: '2025-04-15T12:00:00Z', updatedAt: '2025-06-01T16:00:00Z' },
              { id: 4, name: 'Review bulk email send', event: 'email.bulk', status: 'paused', priority: 'medium', description: 'Pause and review bulk email sends > 100 recipients', createdBy: 'ops', createdAt: '2025-03-10T09:30:00Z', updatedAt: '2025-05-25T11:00:00Z' },
              { id: 5, name: 'Block suspicious IPs', event: 'auth.login', status: 'active', priority: 'high', description: 'Block IPs with > 5 failed login attempts in 10min', createdBy: 'security', createdAt: '2025-02-01T07:00:00Z', updatedAt: '2025-06-18T08:00:00Z' },
              { id: 6, name: 'Notify on large withdrawal', event: 'withdrawal.requested', status: 'draft', priority: 'low', description: 'Send notification when withdrawal > $50,000', createdBy: 'compliance', createdAt: '2025-06-12T15:00:00Z', updatedAt: '2025-06-12T15:00:00Z' },
              { id: 7, name: 'Validate KYC documents', event: 'user.kyc.submitted', status: 'active', priority: 'high', description: 'Auto-validate KYC documents against watchlist', createdBy: 'compliance', createdAt: '2025-01-20T10:00:00Z', updatedAt: '2025-06-14T13:00:00Z' },
              { id: 8, name: 'Escalate VIP support tickets', event: 'ticket.created', status: 'active', priority: 'medium', description: 'Escalate tickets from VIP users to senior support', createdBy: 'support', createdAt: '2025-04-01T08:00:00Z', updatedAt: '2025-05-30T09:00:00Z' },
              { id: 9, name: 'Rate limit API access', event: 'api.request', status: 'paused', priority: 'critical', description: 'Rate limit API requests to 1000/min per tenant', createdBy: 'admin', createdAt: '2025-03-05T11:00:00Z', updatedAt: '2025-06-05T14:00:00Z' },
              { id: 10, name: 'Weekly report generation', event: 'cron.weekly', status: 'draft', priority: 'low', description: 'Generate and email weekly compliance report', createdBy: 'system', createdAt: '2025-06-16T06:00:00Z', updatedAt: '2025-06-16T06:00:00Z' },
              { id: 11, name: 'Cache invalidation on update', event: 'data.updated', status: 'active', priority: 'medium', description: 'Invalidate Redis cache when reference data changes', createdBy: 'dev', createdAt: '2025-05-10T16:00:00Z', updatedAt: '2025-06-17T10:00:00Z' },
              { id: 12, name: 'Auto-archive old logs', event: 'cron.daily', status: 'active', priority: 'low', description: 'Archive audit logs older than 90 days to cold storage', createdBy: 'ops', createdAt: '2025-02-28T09:00:00Z', updatedAt: '2025-06-10T08:00:00Z' },
            ];

            let filtered = [...allRules];
            if (name) filtered = filtered.filter(r => r.name.toLowerCase().includes(name.toLowerCase()));
            if (event) filtered = filtered.filter(r => r.event.toLowerCase().includes(event.toLowerCase()));
            if (status) filtered = filtered.filter(r => r.status.toLowerCase() === status.toLowerCase());
            if (priority) filtered = filtered.filter(r => r.priority.toLowerCase() === priority.toLowerCase());
            if (createdAtFrom) filtered = filtered.filter(r => new Date(r.createdAt) >= new Date(createdAtFrom));
            if (createdAtTo) filtered = filtered.filter(r => new Date(r.createdAt) <= new Date(createdAtTo + 'T23:59:59Z'));

            // Sort
            filtered.sort((a, b) => {
              const av = String(a[sortBy] || '');
              const bv = String(b[sortBy] || '');
              return sortOrder === 'asc'
                ? av.localeCompare(bv)
                : bv.localeCompare(av);
            });

            const total = filtered.length;
            const pageCount = Math.ceil(total / limit);
            const sliced = filtered.slice((page - 1) * limit, page * limit);

            return res.end(JSON.stringify({
              data: sliced,
              meta: { total, page, pageSize: limit, pageCount },
            }));
          }
          if (['/v1/users','/v1/roles','/v1/permissions','/v1/audit-logs','/v1/dashboard','/v1/api-keys'].some(p => url.startsWith(p))) {
            return res.end(JSON.stringify({
              data: [], meta: { total: 0, page: 1, pageSize: 20, pageCount: 1 }
            }));
          }

          next();
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
