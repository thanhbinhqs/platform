/**
 * Seed 1,000 users into the database.
 *
 * Usage:
 *   tsx packages/platform-core/prisma/seed-users.ts
 *
 * Or via pnpm:
 *   pnpm --filter @platform/platform-core prisma:seed
 *
 * Prerequisite: database must be migrated (`prisma migrate dev`).
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

// ─── Name pools for generating display names ───────────────────────────

const FIRST_NAMES = [
  'Alice', 'Bob', 'Charlie', 'Diana', 'Edward', 'Fiona', 'George', 'Hannah',
  'Ivan', 'Julia', 'Kevin', 'Linda', 'Michael', 'Nancy', 'Oscar', 'Patricia',
  'Quinn', 'Rachel', 'Samuel', 'Tina', 'Uma', 'Victor', 'Wendy', 'Xavier',
  'Yvonne', 'Zach', 'Amelia', 'Benjamin', 'Clara', 'Daniel', 'Elena', 'Felix',
  'Grace', 'Henry', 'Isabella', 'Jack', 'Katherine', 'Leo', 'Maria', 'Nathan',
  'Olivia', 'Peter', 'Rebecca', 'Steven', 'Theresa', 'Ulysses', 'Vanessa',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
  'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
];

const STATUSES = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'INACTIVE', 'PENDING_VERIFICATION', 'LOCKED'] as const;

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysBack: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
  d.setHours(0, 0, 0, 0);
  return d;
}

async function main() {
  console.log('🌱 Seeding 1,000 users...\n');
  const start = Date.now();

  const passwordHash = await bcrypt.hash('Password123!', SALT_ROUNDS);
  const usedUsernames = new Set<string>();
  const usedEmails = new Set<string>();

  // Create users in batches of 50 to keep memory low
  const BATCH = 50;
  let created = 0;

  for (let batch = 0; batch < 1000; batch += BATCH) {
    const batchSize = Math.min(BATCH, 1000 - batch);
    const data: any[] = [];

    for (let i = 0; i < batchSize; i++) {
      const idx = batch + i + 1;
      const first = pick(FIRST_NAMES);
      const last = pick(LAST_NAMES);
      const suffix = idx;

      // Ensure unique username & email
      let username = `${first.toLowerCase()}.${last.toLowerCase()}${suffix}`;
      while (usedUsernames.has(username)) {
        username = `${first.toLowerCase()}.${last.toLowerCase()}${suffix}_${Math.floor(Math.random() * 1000)}`;
      }
      usedUsernames.add(username);

      let email = `${first.toLowerCase()}.${last.toLowerCase()}${suffix}@example.com`;
      while (usedEmails.has(email)) {
        email = `${first.toLowerCase()}.${last.toLowerCase()}${suffix}_${Math.floor(Math.random() * 1000)}@example.com`;
      }
      usedEmails.add(email);

      const displayName = idx % 7 === 0 ? null : `${first} ${last}`;
      const status = pick(STATUSES);
      const createdAt = randomDate(365);
      const lastLoginAt = Math.random() > 0.3 ? randomDate(90) : null;

      data.push({
        username,
        email,
        passwordHash,
        displayName,
        status,
        createdAt,
        updatedAt: createdAt,
        lastLoginAt,
        emailVerifiedAt: status !== 'PENDING_VERIFICATION' ? createdAt : null,
      });
    }

    await prisma.$transaction(
      data.map((d) => prisma.user.create({ data: d }))
    );

    created += batchSize;
    console.log(`  ✓ ${created} / 1000 users`);
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n✅ Done! ${created} users created in ${elapsed}s.`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
