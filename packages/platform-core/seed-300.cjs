// @ts-nocheck
// Seed script: 300 rows per table
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const statuses = ['ACTIVE', 'INACTIVE', 'PENDING'];
const categories = ['Jig-Frame', 'Jig-Base', 'Jig-Insert', 'Fixture', 'Pallet', 'Carrier', 'Gauge', 'Tool'];
const triggers = ['MANUAL', 'SCHEDULE', 'EVENT'];
const providers = ['AWS', 'GCP', 'AZURE', 'LOCAL'];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randDate(d) { const x = new Date(); x.setDate(x.getDate() - Math.floor(Math.random() * d)); return x; }

async function main() {
  console.log('🌱 Seeding 300 rows per table...\n');

  // Clear existing seed data
  const models = ['auditLog', 'notification', 'storageBucket', 'scheduledJob', 'integration', 'webhook', 'rule', 'workflowDefinition', 'featureFlag', 'tenant', 'product', 'configurationEntry'];
  for (const m of models) {
    try { await prisma[m].deleteMany({ where: { name: { startsWith: 'seed-' } } }); } catch {}
  }
  console.log('  Cleared previous seed data\n');

  const batchSize = 50;
  let total = 0;

  // 1. Roles (300)
  console.log('Roles...');
  for (let i = 1; i <= 300; i++) {
    try { await prisma.role.create({ data: { name: `seed-role-${i}`, description: `Role #${i}` } }); total++; } catch {}
  }
  console.log(`  ✅ ${total}`);

  // 2. Tenants (300)
  console.log('Tenants...');
  let tCount = 0;
  for (let i = 1; i <= 300; i++) {
    try { await prisma.tenant.create({ data: { name: `seed-tenant-${i}`, code: `TEN-${i}`, status: rand(statuses), createdAt: randDate(90) } }); tCount++; } catch {}
  }
  console.log(`  ✅ ${tCount}`);

  // 3. Feature Flags (300)
  console.log('Feature Flags...');
  let fCount = 0;
  for (let i = 1; i <= 300; i++) {
    try { await prisma.featureFlag.create({ data: { name: `seed-flag-${i}`, description: `Flag #${i}`, isEnabled: Math.random() > 0.5, environment: 'PRODUCTION' } }); fCount++; } catch {}
  }
  console.log(`  ✅ ${fCount}`);

  // 4. Workflows (300)
  console.log('Workflows...');
  let wCount = 0;
  for (let i = 1; i <= 300; i++) {
    try { await prisma.workflowDefinition.create({ data: { name: `seed-workflow-${i}`, description: `Workflow #${i}`, triggerType: rand(triggers), status: 'PUBLISHED', createdAt: randDate(60) } }); wCount++; } catch {}
  }
  console.log(`  ✅ ${wCount}`);

  // 5. Rules (300)
  console.log('Rules...');
  let rCount = 0;
  for (let i = 1; i <= 300; i++) {
    try { await prisma.rule.create({ data: { name: `seed-rule-${i}`, event: `test.event`, conditions: { field: 'status', operator: 'eq', value: 'ACTIVE' }, actions: { type: 'NOTIFY' }, status: 'ACTIVE', priority: Math.floor(Math.random() * 5) + 1, createdAt: randDate(60) } }); rCount++; } catch {}
  }
  console.log(`  ✅ ${rCount}`);

  // 6. Webhooks (300)
  console.log('Webhooks...');
  let hCount = 0;
  for (let i = 1; i <= 300; i++) {
    try { await prisma.webhook.create({ data: { name: `seed-webhook-${i}`, url: `https://hooks.example.com/${i}`, events: ['user.created'], isActive: Math.random() > 0.3, secret: `sec_${i}`, createdAt: randDate(60) } }); hCount++; } catch {}
  }
  console.log(`  ✅ ${hCount}`);

  // 7. Integrations (300)
  console.log('Integrations...');
  let iCount = 0;
  for (let i = 1; i <= 300; i++) {
    try { await prisma.integration.create({ data: { name: `seed-int-${i}`, type: rand(['ERP', 'WMS', 'MES']), provider: rand(providers), config: { endpoint: `https://api.example.com/${i}` }, status: rand(['CONNECTED', 'DISCONNECTED']), createdAt: randDate(60) } }); iCount++; } catch {}
  }
  console.log(`  ✅ ${iCount}`);

  // 8. Scheduled Jobs (300)
  console.log('Scheduled Jobs...');
  let jCount = 0;
  for (let i = 1; i <= 300; i++) {
    try { await prisma.scheduledJob.create({ data: { name: `seed-job-${i}`, type: rand(['SCRIPT', 'WORKFLOW']), cronExpression: `${i % 60} * * * *`, config: { script: `job_${i}.sh` }, isActive: Math.random() > 0.3, createdAt: randDate(60) } }); jCount++; } catch {}
  }
  console.log(`  ✅ ${jCount}`);

  // 9. Storage Buckets (300)
  console.log('Storage Buckets...');
  let bCount = 0;
  for (let i = 1; i <= 300; i++) {
    try { await prisma.storageBucket.create({ data: { name: `seed-bucket-${i}`, provider: rand(providers), config: {}, createdAt: randDate(60) } }); bCount++; } catch {}
  }
  console.log(`  ✅ ${bCount}`);

  // 10. Notifications (300)
  console.log('Notifications...');
  let nCount = 0;
  for (let i = 1; i <= 300; i++) {
    try { await prisma.notification.create({ data: { type: rand(['INFO', 'WARNING']), channel: 'IN_APP', title: `Seed Notification ${i}`, message: `Auto-generated notification #${i} for DataGrid demo.`, isRead: Math.random() > 0.6, createdAt: randDate(30) } }); nCount++; } catch {}
  }
  console.log(`  ✅ ${nCount}`);

  // 11. Audit Logs (300)
  console.log('Audit Logs...');
  let aCount = 0;
  for (let i = 1; i <= 300; i++) {
    try { await prisma.auditLog.create({ data: { action: rand(['CREATE', 'UPDATE', 'DELETE']), entity: rand(['User', 'Role', 'Product', 'Order']), entityId: String(i), metadata: { seed: true }, ipAddress: `192.168.1.${i % 255}`, createdAt: randDate(60) } }); aCount++; } catch {}
  }
  console.log(`  ✅ ${aCount}`);

  // 12. Products (300)
  console.log('Products...');
  let pCount = 0;
  for (let i = 1; i <= 300; i++) {
    try { await prisma.product.create({ data: { code: `JIG-${String(i).padStart(5, '0')}`, name: `seed-product-${i}`, description: `Product #${i}`, category: rand(categories), status: rand(['ACTIVE', 'INACTIVE']), price: Math.round(Math.random() * 9500 + 50000) / 100, stock: Math.floor(Math.random() * 500), minStock: 10, unit: 'piece', createdAt: randDate(90) } }); pCount++; } catch {}
  }
  console.log(`  ✅ ${pCount}`);

  console.log(`\n✅ Complete! ~${total + tCount + fCount + wCount + rCount + hCount + iCount + jCount + bCount + nCount + aCount + pCount} rows created.`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
