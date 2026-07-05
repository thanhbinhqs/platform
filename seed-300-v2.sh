#!/bin/bash
# Seed 300 rows per table — using actual column names (camelCase from Prisma)
export PGLIB='/tmp/pg18/usr/lib'
export LD_LIBRARY_PATH="$PGLIB:/usr/lib"
export PATH="/tmp/pg18/usr/bin:$PATH"
PSQL="psql -h localhost -U postgres -d platform -q -tA -c"

TS=$(date +%s)
echo "🌱 Seeding 300 rows per table..."
echo ""

seed() {
  echo -n "$1... "
  R=$($PSQL "$2" 2>&1)
  echo "$R"
}

# Products (300)
seed "Products" "INSERT INTO products (code, name, description, category, status, price, stock, minStock, unit, createdAt)
SELECT 'JIG-' || ($TS + s.i), 'Product ' || s.i, 'Product #' || s.i,
  (ARRAY['Jig-Frame','Jig-Base','Jig-Insert','Fixture','Pallet'])[(s.i % 5) + 1],
  (ARRAY['ACTIVE','INACTIVE'])[(s.i % 2) + 1],
  (random() * 9500 + 500)::numeric(10,2),
  floor(random() * 500 + 1)::int, 10, 'piece',
  NOW() - (random() * 90 || ' days')::interval
FROM generate_series(1,300) s(i) ON CONFLICT DO NOTHING;"

# Tenants (300)
seed "Tenants" "INSERT INTO tenants (name, code, status, createdAt)
SELECT 'Tenant-' || s.i, 'TEN-' || s.i,
  (ARRAY['ACTIVE','INACTIVE','PENDING'])[(s.i % 3) + 1],
  NOW() - (random() * 90 || ' days')::interval
FROM generate_series(1,300) s(i) ON CONFLICT DO NOTHING;"

# Feature Flags (300)
seed "FeatureFlags" "INSERT INTO feature_flags (name, description, isEnabled, environment, flagType, createdAt)
SELECT 'flag-' || s.i, 'Flag #' || s.i, 
  (random() > 0.5), 'PRODUCTION', 'RELEASE',
  NOW() - (random() * 60 || ' days')::interval
FROM generate_series(1,300) s(i) ON CONFLICT DO NOTHING;"

# Workflows (300)
seed "Workflows" "INSERT INTO workflow_definitions (name, description, triggerType, status, createdAt)
SELECT 'WF-' || s.i, 'Workflow #' || s.i,
  (ARRAY['MANUAL','SCHEDULE','EVENT'])[(s.i % 3) + 1], 'PUBLISHED',
  NOW() - (random() * 60 || ' days')::interval
FROM generate_series(1,300) s(i);"

# Rules (300)
seed "Rules" "INSERT INTO rules (name, event, conditions, actions, status, priority, createdAt)
SELECT 'Rule-' || s.i, 'test.event', '{\"field\":\"status\"}'::jsonb, '{\"type\":\"notify\"}'::jsonb, 'ACTIVE', (s.i % 5) + 1,
  NOW() - (random() * 60 || ' days')::interval
FROM generate_series(1,300) s(i);"

# Webhooks (300)
seed "Webhooks" "INSERT INTO webhooks (name, url, events, isActive, secret, createdAt)
SELECT 'WH-' || s.i, 'https://hook.example.com/' || s.i, '[\"test\"]'::jsonb, (random() > 0.3), 'sec_' || s.i,
  NOW() - (random() * 60 || ' days')::interval
FROM generate_series(1,300) s(i);"

# Integrations (300)
seed "Integrations" "INSERT INTO integrations (name, type, provider, config, status, createdAt)
SELECT 'INT-' || s.i, (ARRAY['ERP','WMS','MES','CRM'])[(s.i % 4) + 1],
  (ARRAY['AWS','GCP','AZURE','LOCAL'])[(s.i % 4) + 1],
  '{\"endpoint\":\"https://api.example.com\"}'::jsonb,
  (ARRAY['CONNECTED','DISCONNECTED'])[(s.i % 2) + 1],
  NOW() - (random() * 60 || ' days')::interval
FROM generate_series(1,300) s(i);"

# Scheduled Jobs (300)
seed "ScheduledJobs" "INSERT INTO scheduled_jobs (name, type, cronExpression, config, isActive, createdAt)
SELECT 'Job-' || s.i, (ARRAY['SCRIPT','WORKFLOW','NOTIFICATION'])[(s.i % 3) + 1],
  (s.i % 60) || ' * * * *', '{}'::jsonb, (random() > 0.3),
  NOW() - (random() * 60 || ' days')::interval
FROM generate_series(1,300) s(i);"

# Storage Buckets (300)
seed "Storage" "INSERT INTO storage_buckets (name, provider, config, createdAt)
SELECT 'bucket-' || s.i, (ARRAY['AWS','GCP','AZURE','LOCAL'])[(s.i % 4) + 1], '{}'::jsonb,
  NOW() - (random() * 60 || ' days')::interval
FROM generate_series(1,300) s(i);"

# Notifications (300)
seed "Notifs" "INSERT INTO notifications (type, channel, title, message, isRead, createdAt)
SELECT 'INFO', 'IN_APP', 'Notification ' || s.i, 'Auto-generated #' || s.i, (random() > 0.6),
  NOW() - (random() * 30 || ' days')::interval
FROM generate_series(1,300) s(i);"

# Audit Logs (300)
seed "AuditLogs" "INSERT INTO audit_logs (action, entity, entityId, metadata, ipAddress, createdAt, updatedAt)
SELECT (ARRAY['CREATE','UPDATE','DELETE','READ'])[(s.i % 4) + 1],
  (ARRAY['User','Role','Product','Order'])[(s.i % 4) + 1], s.i::text, '{}'::jsonb,
  '10.0.0.' || (s.i % 254),
  NOW() - (random() * 60 || ' days')::interval,
  NOW() - (random() * 60 || ' days')::interval
FROM generate_series(1,300) s(i);"

# Verification
echo ""
echo "=== VERIFICATION ==="
for tbl in products tenants feature_flags workflow_definitions rules webhooks integrations scheduled_jobs storage_buckets notifications audit_logs; do
  cnt=$(psql -h localhost -U postgres -d platform -tA -c "SELECT count(*) FROM $tbl;" 2>/dev/null)
  printf "  %-25s %s rows\n" "$tbl:" "$cnt"
done
echo ""
echo "✅ Done!"
