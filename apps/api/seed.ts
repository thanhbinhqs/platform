import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@platform.local';
const ADMIN_USERNAME = process.env.SEED_ADMIN_USERNAME ?? 'admin';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123456';

async function main() {
  console.log('🌱 Seeding database...');

  // ---------------------------------------------------------------------------
  // Permissions
  // ---------------------------------------------------------------------------
  const permissionDefs = [
    // User management
    { action: 'manage', resource: 'users' },
    { action: 'read', resource: 'users' },
    { action: 'create', resource: 'users' },
    { action: 'update', resource: 'users' },
    { action: 'delete', resource: 'users' },
    // Role management
    { action: 'manage', resource: 'roles' },
    { action: 'read', resource: 'roles' },
    { action: 'create', resource: 'roles' },
    { action: 'update', resource: 'roles' },
    { action: 'delete', resource: 'roles' },
    // Tenant management
    { action: 'manage', resource: 'tenants' },
    // Reporting
    { action: 'read', resource: 'reports' },
    // System
    { action: 'manage', resource: 'system' },
  ];

  const permissions: { id: string; action: string; resource: string }[] = [];

  for (const def of permissionDefs) {
    const perm = await prisma.permission.upsert({
      where: { action_resource: { action: def.action, resource: def.resource } },
      update: {},
      create: def,
    });
    permissions.push(perm);
  }

  console.log(`  ✓ ${permissions.length} permissions`);

  // ---------------------------------------------------------------------------
  // Roles
  // ---------------------------------------------------------------------------
  const superAdminRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: '', name: 'super_admin' } },
    update: {},
    create: {
      name: 'super_admin',
      description: 'Super administrator — full system access',
      type: 'SYSTEM',
      isSystem: true,
      tenantId: null,
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: '', name: 'admin' } },
    update: {},
    create: {
      name: 'admin',
      description: 'Administrator — tenant-wide access',
      type: 'SYSTEM',
      isSystem: false,
      tenantId: null,
    },
  });

  const userRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: '', name: 'user' } },
    update: {},
    create: {
      name: 'user',
      description: 'Regular platform user',
      type: 'SYSTEM',
      isSystem: false,
      tenantId: null,
    },
  });

  console.log(`  ✓ Roles: ${superAdminRole.name}, ${adminRole.name}, ${userRole.name}`);

  // ---------------------------------------------------------------------------
  // Role ↔ Permission assignments
  // ---------------------------------------------------------------------------
  // Super admin gets ALL permissions
  for (const perm of permissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: superAdminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: superAdminRole.id, permissionId: perm.id },
    });
  }

  // Admin gets manage:users, read:roles, read:reports
  const adminPermActions = [
    { action: 'manage', resource: 'users' },
    { action: 'read', resource: 'roles' },
    { action: 'read', resource: 'reports' },
  ];
  for (const { action, resource } of adminPermActions) {
    const perm = permissions.find((p) => p.action === action && p.resource === resource);
    if (perm) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id },
        },
        update: {},
        create: { roleId: adminRole.id, permissionId: perm.id },
      });
    }
  }

  console.log(`  ✓ Permissions assigned to roles`);

  // ---------------------------------------------------------------------------
  // Admin user
  // ---------------------------------------------------------------------------
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);

  const adminUser = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { passwordHash },
    create: {
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
      passwordHash,
      displayName: 'System Administrator',
      status: 'ACTIVE',
      tenantId: null,
    },
  });

  // Assign super_admin role
  const existingRole = await prisma.userRole.findUnique({
    where: { userId_roleId: { userId: adminUser.id, roleId: superAdminRole.id } },
  });
  if (!existingRole) {
    await prisma.userRole.create({
      data: { userId: adminUser.id, roleId: superAdminRole.id },
    });
  }

  console.log(`  ✓ Admin user: ${ADMIN_EMAIL}`);
  console.log(`  ✓ Password: ${ADMIN_PASSWORD}`);
  console.log('\n✅ Seeding complete.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
