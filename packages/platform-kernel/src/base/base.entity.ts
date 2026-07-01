/**
 * Base entity with common fields for all database models.
 * Maps directly to Prisma model patterns.
 */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  deletedBy?: string | null;
}
