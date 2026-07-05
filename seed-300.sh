#!/bin/bash
# Seed 300 rows per table
export PGLIB='/tmp/pg18/usr/lib'
export LD_LIBRARY_PATH="$PGLIB:/usr/lib"
export PATH="/tmp/pg18/usr/bin:$PATH"
PSQL="psql -h localhost -U postgres -d platform -q -c"

TS=$(date +%s)

echo "🌱 Seeding 300 rows per table..."
echo ""

# 1. Products (300)
echo -n "Products... "
$PSQL "INSERT INTO products (code, name, description, category, status, price, stock, min_stock, unit, created_at)
SELECT 'JIG-' || ($TS + s.i), 'Product ' || s.i, 'Product #' || s.i,
  (ARRAY['Jig-Frame','Jig-Base','Jig-Insert','Fixture','Pallet','Carrier','Gauge'])[(s.i % 7) + 1],
  (ARRAY['ACTIVE','INACTIVE'])[(s.i % 2) + 1],
  (random() * 9500 + 500)::numeric(10,2),
  floor(random() * 500 + 1)::int, 10, 'piece',
  NOW() - (random() * 90 || ' days')::interval
FROM generate_series(1,300) s(i) ON CONFLICT DO NOTHING;" 2>&1 | grep -c INSERT

# 2. Tenants (300)
echo -n "Tenants... "
$PSQL "INSERT INTO tenants (name, code, status, created_at)
SELECT 'Tenant-' || s.i, 'TEN-' || s.i,
  (ARRAY['ACTIVE','INACTIVE','PENDING'])[(s.i % 3) + 1],
  NOW() - (random() * 90 || ' days')::interval
FROM generate_series(1,300) s(i) ON CONFLICT DO NOTHING;" 2>&1 | grep -c INSERT

# 3. Feature Flags (300)
echo -n "Feature Flags... "
$PSQL "INSERT INTO feature_flags (name, description, is_enabled, environment, flag_type, created_at)
SELECT 'flag-' || s.i, 'Flag #' || s.i, 
  (random() > 0.5), 'PRODUCTION', 'RELEASE', NOW() - (random() * 60 || ' days')::interval
FROM generate_series(1,300) s(i) ON CONFLICT DO NOTHING;" 2>&1 | grep -c INSERT

# 4. Workflow Definitions (300)
echo -n "Workflows... "
$PSQL "INSERT INTO workflow_definitions (name, description, trigger_type, status, created_at)
SELECT 'WF-' || s.i, 'Workflow #' || s.i,
  (ARRAY['MANUAL','SCHEDULE','EVENT'])[(s.i % 3) + 1],
  'PUBLISHED', NOW() - (random() * 60 || ' days')::interval
FROM generate_series(1,300) s(i);" 2>&1 | grep -c INSERT

# 5. Rules (300)
echo -n "Rules... "
$PSQL "INSERT INTO rules (name, event, conditions, actions, status, priority, created_at)
SELECT 'Rule-' || s.i, 'test.event', '{\"field\":\"status\"}', '{\"type\":\"notify\"}', 
  'ACTIVE', (s.i % 5) + 1, NOW() - (random() * 60 || ' days')::interval
FROM generate_series(1,300) s(i);" 2>&1 | grep -c INSERT

# 6. Webhooks (300)
echo -n "Webhooks... "
$PSQL "INSERT INTO webhooks (name, url, events, is_active, secret, created_at)
SELECT 'WH-' || s.i, 'https://hook.example.com/' || s.i, '[\"test\"]'::jsonb,
  (random() > 0.3), 'sec_' || s.i, NOW() - (random() * 60 || ' days')::interval
FROM generate_series(1,300) s(i);" 2>&1 | grep -c INSERT

# 7. Integrations (300)
echo -n "Integrations... "
$PSQL "INSERT INTO integrations (name, type, provider, config, status, created_at)
SELECT 'INT-' || s.i,
  (ARRAY['ERP','WMS','MES','CRM'])[(s.i % 4) + 1],
  (ARRAY['AWS','GCP','AZURE','LOCAL'])[(s.i % 4) + 1],
  '{\"endpoint\":\"https://api.example.com\"}'::jsonb,
  (ARRAY['CONNECTED','DISCONNECTED'])[(s.i % 2) + 1],
  NOW() - (random() * 60 || ' days')::interval
FROM generate_series(1,300) s(i);" 2>&1 | grep -c INSERT

# 8. Scheduled Jobs (300)
echo -n "Scheduled Jobs... "
$PSQL "INSERT INTO scheduled_jobs (name, type, cron_expression, config, is_active, created_at)
SELECT 'Job-' || s.i,
  (ARRAY['SCRIPT','WORKFLOW','NOTIFICATION'])[(s.i % 3) + 1],
  (s.i % 60) || ' * * * *', '{}'::jsonb, (random() > 0.3), NOW() - (random() * 60 || ' days')::interval
FROM generate_series(1,300) s(i);" 2>&1 | grep -c INSERT

# 9. Storage Buckets (300)
echo -n "Storage Buckets... "
$PSQL "INSERT INTO storage_buckets (name, provider, config, created_at)
SELECT 'bucket-' || s.i,
  (ARRAY['AWS','GCP','AZURE','LOCAL'])[(s.i % 4) + 1],
  '{}'::jsonb, NOW() - (random() * 60 || ' days')::interval
FROM generate_series(1,300) s(i);" 2>&1 | grep -c INSERT

# 10. Notifications (300)
echo -n "Notifications... "
$PSQL "INSERT INTO notifications (type, channel, title, message, is_read, created_at)
SELECT 'INFO', 'IN_APP', 'Notification ' || s.i, 'Auto-generated #' || s.i, 
  (random() > 0.6), NOW() - (random() * 30 || ' days')::interval
FROM generate_series(1,300) s(i);" 2>&1 | grep -c INSERT

# 11. Audit Logs (300)
echo -n "Audit Logs... "
$PSQL "INSERT INTO audit_logs (action, entity, entity_id, metadata, ip_address, created_at, updated_at)
SELECT (ARRAY['CREATE','UPDATE','DELETE','READ'])[(s.i % 4) + 1],
  (ARRAY['User','Role','Product','Order'])[(s.i % 4) + 1],
  s.i::text, '{}'::jsonb, '10.0.0.' || (s.i % 254),
  NOW() - (random() * 60 || ' days')::interval,
  NOW() - (random() * 60 || ' days')::interval
FROM generate_series(1,300) s(i);" 2>&1 | grep -c INSERT

echo ""
echo "✅ Seeding complete! 3,300 rows across 11 tables."
