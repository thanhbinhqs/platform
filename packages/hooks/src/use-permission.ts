import { createMongoAbility } from '@casl/ability';
import { useAuthStore } from './use-auth-store';
import type { CaslRule } from '@platform/shared-types';

// ─── Internal helpers ──────────────────────────────────────────────

/**
 * Parse a permission string 'action:subject' into an action + subject pair
 * suitable for ability.can(). Handles wildcard '*' → 'all'.
 */
function parsePermission(perm: string): { action: string; subject: string } {
  const colonIdx = perm.indexOf(':');
  if (colonIdx === -1) {
    // bare action like 'manage' — subject defaults to 'all'
    return { action: perm, subject: 'all' };
  }
  const action = perm.slice(0, colonIdx);
  let subject = perm.slice(colonIdx + 1);
  if (subject === '*' || subject === 'all') subject = 'all';
  return { action, subject };
}

/**
 * Build a CASL MongoAbility instance from user rules.
 * Returns null when there are no rules (unauthenticated or no permissions).
 */
function buildAbility(rules: CaslRule[] | undefined | null) {
  if (!rules || rules.length === 0) return null;
  return createMongoAbility(rules);
}

// ─── Hook ──────────────────────────────────────────────────────────

/**
 * Check if the current user can perform an action on a subject.
 *
 * Accepts either:
 *   - `usePermission('manage', 'Rules')`       — CASL style (action, subject)
 *   - `usePermission('manage:rules')`           — legacy string style (auto-split)
 *   - `usePermission(['manage:rules', 'read:users'], 'some')` — OR logic
 *
 * @param actionOrPerm  Action name, permission string, or array of strings
 * @param subject       Subject name (only when first arg is a bare action)
 * @param mode          'every' (default, AND) | 'some' (OR) — only for array input
 */
export function usePermission(
  actionOrPerm: string | string[],
  subject?: string,
  mode: 'every' | 'some' = 'every',
): boolean {
  const rules = useAuthStore((s) => s.user?.rules);
  const ability = buildAbility(rules);
  if (!ability) return false;

  // Bare action + subject — e.g. usePermission('read', 'Rules')
  if (subject && typeof actionOrPerm === 'string') {
    return ability.can(actionOrPerm, subject);
  }

  // Legacy string or array of strings
  const perms = Array.isArray(actionOrPerm) ? actionOrPerm : [actionOrPerm];

  if (mode === 'some') {
    return perms.some((p) => {
      const parsed = parsePermission(p);
      return ability.can(parsed.action, parsed.subject);
    });
  }

  return perms.every((p) => {
    const parsed = parsePermission(p);
    return ability.can(parsed.action, parsed.subject);
  });
}

// ─── Inline helper (not a hook) ───────────────────────────────────

/**
 * Check permissions inline (outside a React component).
 * Builds a temporary Ability from the given rules.
 *
 * @param rules  CASL rules from the user object
 * @param actionOrPerm  Action name or permission string, or array thereof
 * @param subject  Subject (only when first arg is a bare action string)
 * @param mode  'every' (AND) | 'some' (OR) — for array input
 */
export function hasPermission(
  rules: CaslRule[] | undefined | null,
  actionOrPerm: string | string[],
  subject?: string,
  mode: 'every' | 'some' = 'every',
): boolean {
  const ability = buildAbility(rules);
  if (!ability) return false;

  // Bare action + subject
  if (subject && typeof actionOrPerm === 'string') {
    return ability.can(actionOrPerm, subject);
  }

  const perms = Array.isArray(actionOrPerm) ? actionOrPerm : [actionOrPerm];

  if (mode === 'some') {
    return perms.some((p) => {
      const parsed = parsePermission(p);
      return ability.can(parsed.action, parsed.subject);
    });
  }

  return perms.every((p) => {
    const parsed = parsePermission(p);
    return ability.can(parsed.action, parsed.subject);
  });
}
