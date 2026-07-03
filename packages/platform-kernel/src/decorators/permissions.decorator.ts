import { SetMetadata } from '@nestjs/common';
import type { CustomDecorator } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Require specific permissions to access a route handler.
 *
 * Usage:
 * ```ts
 * @Permissions('manage:users')
 * @Permissions('manage:users', 'read:workflows') // AND logic
 * ```
 */
export const Permissions = (...permissions: string[]): CustomDecorator =>
  SetMetadata(PERMISSIONS_KEY, permissions);
