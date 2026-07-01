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
