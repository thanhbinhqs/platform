import { v4 as uuidv4, v7 as uuidv7, validate as uuidValidate } from 'uuid';

/**
 * Generate UUID v4 (random).
 */
export function generateId(): string {
  return uuidv4();
}

/**
 * Generate UUID v7 (time-ordered).
 */
export function generateOrderedId(): string {
  return uuidv7();
}

/**
 * Validate UUID string.
 */
export function isValidUuid(id: string): boolean {
  return uuidValidate(id);
}
