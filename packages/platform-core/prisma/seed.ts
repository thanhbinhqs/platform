// ─── Prisma Seed Script ───────────────────────────────────
// Usage: npx ts-node prisma/seed.ts
// Seeds: Tenant, System Roles, Permissions, Admin User

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create default tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Default',
      slug: 'default',
      status: 'ACTIVE',
      settings: {},
      features: { multiTenant: false, sso: false },
    },
  });
  console.log(`  ✓ Tenant: ${tenant.name}`);

  // 2. Create system permissions
  const permissions = [
    // User management
    { action: 'user:create', resource: 'users' },
    { action: 'user:read', resource: 'users' },
    { action: 'user:update', resource: 'users' },
    { action: 'user:delete', resource: 'users' },
    { action: 'user:list', resource: 'users' },
    // Role management
    { action: 'role:create', resource: 'roles' },
    { action: 'role:read', resource: 'roles' },
    { action: 'role:update', resource: 'roles' },
    { action: 'role:delete', resource: 'roles' },
    // Workflow
    { action: 'workflow:create', resource: 'workflows' },
    { action: 'workflow:read', resource: 'workflows' },
    { action: 'workflow:update', resource: 'workflows' },
    { action: 'workflow:delete', resource: 'workflows' },
    { action: 'workflow:execute', resource: 'workflows' },
    // Audit
    { action: 'audit:read', resource: 'audit-logs' },
    { action: 'audit:export', resource: 'audit-logs' },
    // Settings
    { action: 'settings:read', resource: 'settings' },
    { action: 'settings:update', resource: 'settings' },
    // File storage
    { action: 'file:upload', resource: 'files' },
    { action: 'file:read', resource: 'files' },
    { action: 'file:delete', resource: 'files' },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { action_resource: { action: perm.action, resource: perm.resource } },
      update: {},
      create: perm,
    });
  }
  console.log(`  ✓ ${permissions.length} permissions`);

  // 3. Create system roles
  const superAdmin = await prisma.role.create({
    data: {
      tenantId: tenant.id,
      name: 'Super Admin',
      type: 'SYSTEM',
      isSystem: true,
      description: 'Full system access',
      permissions: {
        create: permissions.map((p) => ({
          permission: { connect: { action_resource: { action: p.action, resource: p.resource } } },
        })),
      },
    },
  });

  const admin = await prisma.role.create({
    data: {
      tenantId: tenant.id,
      name: 'Admin',
      type: 'SYSTEM',
      isSystem: true,
      description: 'Administrative access (no system config)',
      permissions: {
        create: permissions
          .filter((p) => !p.action.startsWith('settings:') && p.action !== 'audit:export')
          .map((p) => ({
            permission: { connect: { action_resource: { action: p.action, resource: p.resource } } },
          })),
      },
    },
  });

  console.log(`  ✓ Roles: ${superAdmin.name}, ${admin.name}`);

  // 4. Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@platform.local' },
    update: {},
    create: {
      tenantId: tenant.id,
      username: 'admin',
      email: 'admin@platform.local',
      displayName: 'System Administrator',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      // Default password: Admin@123 (will be changed on first login)
      passwordHash: '$2b$10$...', // bcrypt hash placeholder
    },
  });

  // Assign role
  await prisma.userRole.create({
    data: {
      userId: adminUser.id,
      roleId: superAdmin.id,
      assignedBy: 'system',
    },
  });
  console.log(`  ✓ Admin user: ${adminUser.email}`);

  console.log('✅ Seed completed');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
