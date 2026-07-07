import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;
const ADMIN_EMAIL = 'admin@platform.local';
const ADMIN_PASSWORD = 'Admin@123456';

async function main() {
  console.log('🌱 Seeding database...');

  // ── Tenants ──────────────────────────────────────────────
  const defaultTenant = await prisma.tenant.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      name: 'Default',
      slug: 'default',
      status: 'ACTIVE',
      settings: {},
      features: { multiTenant: false, sso: false },
    },
  });
  console.log(`  ✓ Tenant: ${defaultTenant.name}`);

  const systemTenant = await prisma.tenant.upsert({
    where: { slug: 'system' },
    update: {},
    create: {
      name: 'System',
      slug: 'system',
      status: 'ACTIVE',
      settings: {},
      features: { multiTenant: false, sso: false },
    },
  });
  console.log(`  ✓ Tenant: ${systemTenant.name}`);

  // ── Permissions (CASL-style: action:resource) ───────────
  const permissionDefs = [
    { action: 'manage', resource: 'users' },
    { action: 'read', resource: 'users' },
    { action: 'create', resource: 'users' },
    { action: 'update', resource: 'users' },
    { action: 'delete', resource: 'users' },
    { action: 'manage', resource: 'roles' },
    { action: 'read', resource: 'roles' },
    { action: 'create', resource: 'roles' },
    { action: 'update', resource: 'roles' },
    { action: 'delete', resource: 'roles' },
    { action: 'manage', resource: 'tenants' },
    { action: 'manage', resource: 'settings' },
    { action: 'read', resource: 'settings' },
    { action: 'manage', resource: 'system' },
    { action: 'read', resource: 'audit-logs' },
    { action: 'manage', resource: 'workflows' },
    { action: 'read', resource: 'workflows' },
    { action: 'execute', resource: 'workflows' },
  ];

  const permissions: { id: string; action: string; resource: string }[] = [];
  for (const def of permissionDefs) {
    const perm = await prisma.permission.upsert({
      where: { action_resource: { action: def.action, resource: def.resource } },
      update: {},
      create: { action: def.action, resource: def.resource },
    });
    permissions.push(perm);
  }
  console.log(`  ✓ ${permissions.length} permissions`);

  // ── Roles ───────────────────────────────────────────────
  const superAdminRole = await prisma.role.upsert({
    where: {
      tenantId_name: { tenantId: systemTenant.id, name: 'super_admin' },
    },
    update: {},
    create: {
      tenantId: systemTenant.id,
      name: 'super_admin',
      description: 'Full system access across all tenants',
      type: 'SYSTEM',
      isSystem: true,
      permissions: {
        create: permissions.map((p) => ({
          permission: { connect: { id: p.id } },
        })),
      },
    },
  });
  console.log(`  ✓ Role: ${superAdminRole.name}`);

  const adminRole = await prisma.role.upsert({
    where: {
      tenantId_name: { tenantId: defaultTenant.id, name: 'admin' },
    },
    update: {},
    create: {
      tenantId: defaultTenant.id,
      name: 'admin',
      description: 'Tenant administrator',
      type: 'SYSTEM',
      isSystem: true,
      permissions: {
        create: permissions
          .filter(
            (p) =>
              !p.action.startsWith('manage:system') &&
              p.resource !== 'system' &&
              p.resource !== 'settings',
          )
          .map((p) => ({
            permission: { connect: { id: p.id } },
          })),
      },
    },
  });
  console.log(`  ✓ Role: ${adminRole.name}`);

  const userRole = await prisma.role.upsert({
    where: {
      tenantId_name: { tenantId: defaultTenant.id, name: 'user' },
    },
    update: {},
    create: {
      tenantId: defaultTenant.id,
      name: 'user',
      description: 'Regular platform user',
      type: 'CUSTOM',
      isSystem: false,
      permissions: {
        create: permissions
          .filter((p) => p.resource === 'workflows' && p.action === 'read')
          .map((p) => ({
            permission: { connect: { id: p.id } },
          })),
      },
    },
  });
  console.log(`  ✓ Role: ${userRole.name}`);

  // ── Admin User ──────────────────────────────────────────
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);

  const adminUser = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { passwordHash },
    create: {
      tenantId: systemTenant.id,
      username: 'admin',
      email: ADMIN_EMAIL,
      passwordHash,
      displayName: 'System Administrator',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  });

  // Assign super_admin role
  const existingAssignment = await prisma.userRole.findUnique({
    where: { userId_roleId: { userId: adminUser.id, roleId: superAdminRole.id } },
  });
  if (!existingAssignment) {
    await prisma.userRole.create({
      data: {
        userId: adminUser.id,
        roleId: superAdminRole.id,
        assignedBy: 'system',
      },
    });
  }

  console.log(`  ✓ Admin user: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);

  // ── Rules (1000 rows) ────────────────────────────────────
  const ruleEvents = [
    'claim.submitted', 'transaction.created', 'admin.action', 'email.bulk',
    'auth.login', 'withdrawal.requested', 'user.kyc.submitted', 'ticket.created',
    'api.request', 'cron.weekly', 'data.updated', 'cron.daily',
    'order.placed', 'order.cancelled', 'payment.failed', 'invoice.generated',
    'user.registered', 'user.deleted', 'report.generated', 'alert.threshold',
  ];
  const ruleStatuses: ('DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'ERROR')[] = [
    'DRAFT', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'PAUSED', 'ARCHIVED', 'ERROR',
  ];
  const rulePriorities = [1, 2, 3, 4, 5]; // 1=low, 5=urgent/critical
  const rulePrefixes = [
    'Auto-approve', 'Flag', 'Require', 'Review', 'Block', 'Notify', 'Validate',
    'Escalate', 'Rate limit', 'Generate', 'Archive', 'Invalidate', 'Detect',
    'Prevent', 'Monitor', 'Approve', 'Reject', 'Deploy', 'Rollback', 'Sync',
    'Backup', 'Restore', 'Verify', 'Audit', 'Alert',
  ];
  const ruleSubjects = [
    'low-value claims', 'high-risk transactions', 'admin actions', 'bulk email',
    'suspicious IPs', 'large withdrawals', 'KYC documents', 'VIP tickets',
    'API access', 'weekly reports', 'cache on update', 'old logs',
    'new orders', 'failed payments', 'user registrations', 'invoices',
    'data exports', 'security alerts', 'configuration changes', 'system backups',
  ];

  // Delete existing seed rules first
  const existingRules = await prisma.rule.findMany({ where: { createdBy: 'seed' }, select: { id: true } });
  if (existingRules.length > 0) {
    await prisma.ruleExecution.deleteMany({ where: { ruleId: { in: existingRules.map(r => r.id) } } });
    await prisma.rule.deleteMany({ where: { createdBy: 'seed' } });
    console.log(`  ✓ Cleaned ${existingRules.length} existing seed rules`);
  }

  const rulesBatch: any[] = [];
  const now = new Date();
  for (let i = 1; i <= 1000; i++) {
    const prefix = rulePrefixes[i % rulePrefixes.length];
    const subject = ruleSubjects[i % ruleSubjects.length];
    const event = ruleEvents[i % ruleEvents.length];
    const status = ruleStatuses[i % ruleStatuses.length];
    const priority = rulePriorities[i % rulePriorities.length];
    const daysAgo = Math.floor(Math.random() * 365);
    const createdAt = new Date(now.getTime() - daysAgo * 86400000);
    const updatedAt = new Date(createdAt.getTime() + Math.floor(Math.random() * 30) * 86400000);

    rulesBatch.push({
      tenantId: defaultTenant.id,
      name: `${prefix} ${subject} #${i}`,
      description: `Rule #${i}: ${prefix.toLowerCase()} ${subject} automatically via event-driven automation.`,
      priority,
      status,
      event,
      conditions: { field: event.split('.')[0], operator: 'eq', value: event.split('.')[1] },
      actions: { type: status === 'ACTIVE' ? 'EXECUTE' : 'QUEUE', target: 'notification', params: { channel: 'email' } },
      metadata: { seed: true, batch: Math.ceil(i / 100) },
      createdBy: 'seed',
      updatedBy: 'seed',
      createdAt,
      updatedAt,
    });
  }

  // Batch insert
  const BATCH_SIZE = 100;
  let inserted = 0;
  for (let i = 0; i < rulesBatch.length; i += BATCH_SIZE) {
    const batch = rulesBatch.slice(i, i + BATCH_SIZE);
    await prisma.rule.createMany({ data: batch, skipDuplicates: true });
    inserted += batch.length;
    console.log(`  → Rules: ${inserted}/${rulesBatch.length}`);
  }
  console.log(`  ✓ ${inserted} rules seeded`);

  console.log('✅ Seed completed.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
