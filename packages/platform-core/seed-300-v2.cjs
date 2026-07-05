// @ts-nocheck
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const cats = ['Jig-Frame', 'Jig-Base', 'Jig-Insert', 'Fixture', 'Pallet'];
const statii = ['ACTIVE', 'INACTIVE', 'PENDING'];
const triggers = ['MANUAL', 'SCHEDULE', 'EVENT'];
const providers = ['AWS', 'GCP', 'AZURE'];

function rand(a) { return a[Math.floor(Math.random() * a.length)]; }
function rd(d) { const x = new Date(); x.setDate(x.getDate() - Math.floor(Math.random() * d)); return x; }

async function main() {
  console.log('🌱 Seeding data via Prisma...\n');
  let t = 0;
  const g = Date.now();

  const batch = async (model, count, gen) => {
    let ok = 0;
    for (let i = 1; i <= count; i++) {
      try { await prisma[model].create({ data: gen(i) }); ok++; } catch (e) { if (ok === 0 && i === 1) console.log(`  ${e.message.slice(0,80)}`); }
    }
    console.log(`  ${model}: ${ok}/${count}`);
    return ok;
  };

  t += await batch('tenant', 300, i => ({ name: `Tenant-${g}-${i}`, code: `T${g}-${i}`, status: rand(statii), createdAt: rd(90) }));
  t += await batch('featureFlag', 300, i => ({ name: `Flag-${g}-${i}`, isEnabled: Math.random() > 0.5, environment: 'PRODUCTION', flagType: 'RELEASE' }));
  t += await batch('workflowDefinition', 300, i => ({ name: `WF-${g}-${i}`, triggerType: rand(triggers), status: 'PUBLISHED', createdAt: rd(60) }));
  t += await batch('webhook', 300, i => ({ name: `WH-${g}-${i}`, url: `https://hook.example.com/${g}-${i}`, events: ['test'], isActive: true, secret: `s_${g}_${i}`, createdAt: rd(60) }));
  t += await batch('integration', 300, i => ({ name: `INT-${g}-${i}`, type: rand(['ERP','WMS','MES']), provider: rand(providers), config: { url: `https://api.example.com/${g}-${i}` }, status: 'CONNECTED', createdAt: rd(60) }));
  t += await batch('scheduledJob', 300, i => ({ name: `Job-${g}-${i}`, type: 'SCRIPT', cronExpression: `${i%60} * * * *`, config: {}, isActive: true, createdAt: rd(60) }));
  t += await batch('storageBucket', 300, i => ({ name: `bucket-${g}-${i}`, provider: rand(providers), config: {}, createdAt: rd(60) }));
  t += await batch('notification', 300, i => ({ type: 'INFO', channel: 'IN_APP', title: `Notif ${g}-${i}`, message: `Seed notification #${g}-${i}`, isRead: false, createdAt: rd(30) }));
  t += await batch('auditLog', 300, i => ({ action: rand(['CREATE','UPDATE','DELETE']), entity: rand(['User','Role','Product']), entityId: String(i), metadata: {}, ipAddress: `10.0.0.${i%254}`, createdAt: rd(60) }));
  t += await batch('product', 300, i => ({ code: `JIG-${g}-${i}`, name: `Product ${g}-${i}`, category: rand(cats), status: 'ACTIVE', price: Math.round(Math.random()*9000+1000*100)/100, stock: Math.floor(Math.random()*500), minStock: 10, unit: 'piece', createdAt: rd(90) }));
  t += await batch('storageFile', 300, i => ({ filename: `file-${g}-${i}.dat`, size: Math.floor(Math.random()*1000000), mimeType: 'application/octet-stream', createdAt: rd(30) }));
  t += await batch('rule', 300, i => ({ name: `Rule-${g}-${i}`, event: 'test.event', conditions: {a:1}, actions: {b:2}, status: 'ACTIVE', priority: Math.floor(Math.random()*5)+1, createdAt: rd(60) }));
  t += await batch('scheduledJob', 300, i => ({ name: `Sched-${g}-${i}`, type: 'WORKFLOW', cronExpression: `0 ${i%24} * * *`, config: {wf: i}, isActive: true, createdAt: rd(60) }));

  console.log(`\n✅ Complete! ${t} total rows created.`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
