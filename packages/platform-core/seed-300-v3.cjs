// @ts-nocheck
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const cats = ['Jig-Frame','Jig-Base','Jig-Insert','Fixture','Pallet','Carrier','Gauge'];
const stats = ['ACTIVE','INACTIVE'];
const trigs = ['MANUAL','SCHEDULE','EVENT'];
const provs = ['AWS','GCP','AZURE','LOCAL'];
const ents = ['User','Role','Product','Order','Workflow'];
const acts = ['CREATE','UPDATE','DELETE','READ'];
const envs = ['ERP','WMS','MES','CRM'];

function r(a) { return a[Math.floor(Math.random() * a.length)]; }
function rd(n) { const d = new Date(); d.setDate(d.getDate() - Math.floor(Math.random() * n)); return d; }

async function main() {
  console.log('🌱 Seeding via Prisma...\n');
  const start = Date.now();
  let total = 0;

  const batch = async (model, count, gen) => {
    let ok = 0;
    for (let i = 1; i <= count; i++) {
      try { await prisma[model].create({ data: gen(i) }); ok++; } catch (e) { /* ignore dupes */ }
    }
    if (ok > 0) total += ok;
    return ok;
  };

  const n = 300;

  total += await batch('product', n, i => ({ code: `PRD-${start}-${i}`, name: `Product ${i}`, description: `Product #${i}`, category: r(cats), status: r(stats), price: Math.round(Math.random()*9500+500*100)/100, stock: Math.floor(Math.random()*500), minStock: 10, unit: 'piece', createdAt: rd(90) }));
  console.log(`  Products: ${total}`);

  total += await batch('tenant', n, i => ({ name: `Tenant-${start}-${i}`, code: `T${start}-${i}`, status: r(stats), createdAt: rd(90) }));
  console.log(`  +Tenants: ${total}`);

  total += await batch('featureFlag', n, i => ({ name: `Flag-${start}-${i}`, isEnabled: Math.random() > 0.5, environment: 'PRODUCTION', flagType: 'RELEASE', createdAt: rd(60) }));
  console.log(`  +Flags: ${total}`);

  total += await batch('workflowDefinition', n, i => ({ name: `WF-${start}-${i}`, description: `WF #${i}`, triggerType: r(trigs), status: 'PUBLISHED', createdAt: rd(60) }));
  console.log(`  +Workflows: ${total}`);

  total += await batch('rule', n, i => ({ name: `Rule-${start}-${i}`, event: 'test.event', conditions: {field:'status'}, actions: {type:'notify'}, status: 'ACTIVE', priority: (i%5)+1, createdAt: rd(60) }));
  console.log(`  +Rules: ${total}`);

  total += await batch('webhook', n, i => ({ name: `WH-${start}-${i}`, url: `https://hook.example.com/${i}`, events: ['test'], isActive: true, secret: `sec_${i}`, createdAt: rd(60) }));
  console.log(`  +Webhooks: ${total}`);

  total += await batch('integration', n, i => ({ name: `INT-${start}-${i}`, type: r(envs), provider: r(provs), config: {url:`https://api.example.com/${i}`}, status: 'CONNECTED', createdAt: rd(60) }));
  console.log(`  +Integrations: ${total}`);

  total += await batch('scheduledJob', n, i => ({ name: `Job-${start}-${i}`, type: 'SCRIPT', cronExpression: `${i%60} * * * *`, config: {}, isActive: true, createdAt: rd(60) }));
  console.log(`  +Jobs: ${total}`);

  total += await batch('storageBucket', n, i => ({ name: `Bucket-${start}-${i}`, provider: r(provs), config: {}, createdAt: rd(60) }));
  console.log(`  +Buckets: ${total}`);

  total += await batch('notification', n, i => ({ type: 'INFO', channel: 'IN_APP', title: `Notif ${i}`, message: `Seed #${i}`, isRead: false, createdAt: rd(30) }));
  console.log(`  +Notifs: ${total}`);

  total += await batch('auditLog', n, i => ({ action: r(acts), entity: r(ents), entityId: String(i), metadata: {}, ipAddress: `10.0.0.${i%254}`, createdAt: rd(60), updatedAt: rd(30) }));
  console.log(`  +Audit: ${total}`);

  total += await batch('storageFile', n, i => ({ filename: `file-${i}.dat`, size: Math.floor(Math.random()*1000000), mimeType: 'application/octet-stream', createdAt: rd(30) }));
  console.log(`  +Files: ${total}`);

  total += await batch('configurationEntry', n, i => ({ key: `seed.key.${i}`, value: JSON.stringify({n:i}), scope: 'GLOBAL', type: 'JSON', createdAt: rd(90) }));
  console.log(`  +Config: ${total}`);

  console.log(`\n✅ Complete! ${total} total rows created.`);
}

main().catch(e => { console.error(e.message.slice(0,200)); process.exit(1); }).finally(() => prisma.$disconnect());
