import { describe, it, expect } from 'vitest';
import { hasModuleAccess, getAccessibleModules, hasAnyAdminAccess } from '../lib/admin-modules';

// ─── hasModuleAccess ─────────────────────────────────────────

describe('hasModuleAccess', () => {
  it('returns true when user has explicit read permission', () => {
    expect(hasModuleAccess(['read:users'], 'users')).toBe(true);
  });

  it('returns false when user has no relevant permission', () => {
    expect(hasModuleAccess(['read:roles'], 'users')).toBe(false);
  });

  it('returns true when user has manage permission (implies all actions)', () => {
    expect(hasModuleAccess(['manage:users'], 'users', 'read')).toBe(true);
    expect(hasModuleAccess(['manage:users'], 'users', 'delete')).toBe(true);
  });

  it('returns true when user has wildcard manage:all', () => {
    expect(hasModuleAccess(['manage:all'], 'users')).toBe(true);
    expect(hasModuleAccess(['manage:all'], 'roles')).toBe(true);
    expect(hasModuleAccess(['manage:all'], 'audit-logs')).toBe(true);
  });

  it('returns true when user has wildcard read:all', () => {
    expect(hasModuleAccess(['read:all'], 'users')).toBe(true);
    expect(hasModuleAccess(['read:all'], 'any-module')).toBe(true);
  });

  it('returns false for empty permissions array', () => {
    expect(hasModuleAccess([], 'users')).toBe(false);
  });

  it('requires exact resource match', () => {
    expect(hasModuleAccess(['manage:user'], 'users')).toBe(false);
  });

  it('returns false for non-matching wildcard permissions', () => {
    expect(hasModuleAccess(['manage:users'], 'audit-logs')).toBe(false);
  });

  it('handles multiple permissions including the target', () => {
    expect(hasModuleAccess(['read:roles', 'manage:users', 'read:tenants'], 'users')).toBe(true);
  });

  it('handles multiple permissions without the target', () => {
    expect(hasModuleAccess(['read:roles', 'read:tenants', 'manage:settings'], 'users')).toBe(false);
  });
});

// ─── getAccessibleModules ────────────────────────────────────

describe('getAccessibleModules', () => {
  it('returns modules for which the user has read permission', () => {
    const mods = getAccessibleModules(['read:users']);
    expect(mods).toHaveLength(1);
    expect(mods[0]!.id).toBe('users');
  });

  it('returns multiple modules for manage:all', () => {
    const mods = getAccessibleModules(['manage:all']);
    // All 16 modules should be returned
    expect(mods.length).toBeGreaterThanOrEqual(16);
  });

  it('returns modules matching multiple permissions', () => {
    const mods = getAccessibleModules(['read:users', 'manage:roles', 'read:audit-logs']);
    const ids = mods.map((m) => m.id);
    expect(ids).toContain('users');
    expect(ids).toContain('roles');
    expect(ids).toContain('audit-logs');
    // Should NOT include modules not in permissions
    expect(ids).not.toContain('settings');
    expect(ids).not.toContain('api-keys');
  });

  it('returns empty array for no permissions', () => {
    expect(getAccessibleModules([])).toHaveLength(0);
  });

  it('returns empty array for unrelated permissions', () => {
    // Permissions for modules not in the admin registry
    expect(getAccessibleModules(['read:profile', 'read:dashboard'])).toHaveLength(0);
  });

  it('deduplicates modules (manage:all and specific both)', () => {
    const mods = getAccessibleModules(['manage:all', 'read:users']);
    expect(mods.length).toBeGreaterThanOrEqual(16);
  });
});

// ─── hasAnyAdminAccess ───────────────────────────────────────

describe('hasAnyAdminAccess', () => {
  it('returns true when user can access at least one module', () => {
    expect(hasAnyAdminAccess(['read:users'])).toBe(true);
  });

  it('returns true for manage:all', () => {
    expect(hasAnyAdminAccess(['manage:all'])).toBe(true);
  });

  it('returns false for empty permissions', () => {
    expect(hasAnyAdminAccess([])).toBe(false);
  });

  it('returns false for non-admin permissions', () => {
    expect(hasAnyAdminAccess(['read:profile'])).toBe(false);
  });
});
