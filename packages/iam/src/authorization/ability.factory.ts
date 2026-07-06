import { Injectable } from '@nestjs/common';
import { AbilityBuilder, createMongoAbility, type MongoAbility, type RawRuleOf } from '@casl/ability';

// ─── Types ──────────────────────────────────────────────────────────

type Actions = string;
type Subjects = string;
export type AppAbility = MongoAbility<[Actions, Subjects]>;
export type CaslRule = RawRuleOf<AppAbility>;

// ─── Helpers ────────────────────────────────────────────────────────

function toSubject(resource: string): string {
  if (resource === '*' || resource === 'all') return 'all';
  return resource.charAt(0).toUpperCase() + resource.slice(1);
}

// ─── Factory ────────────────────────────────────────────────────────

@Injectable()
export class AbilityFactory {
  /**
   * Convert raw DB permission pairs into a CASL Ability instance.
   * @param allowed — [{ action: 'read', resource: 'rules' }, …]
   * @param denied  — [{ action: 'delete', resource: 'rules' }, …]
   */
  createFromPermissions(
    allowed: { action: string; resource: string }[],
    denied: { action: string; resource: string }[] = [],
  ): AppAbility {
    const { can, cannot, rules } = new AbilityBuilder<AppAbility>(createMongoAbility);

    for (const p of allowed) {
      can(p.action, toSubject(p.resource));
    }
    for (const p of denied) {
      cannot(p.action, toSubject(p.resource));
    }

    return createMongoAbility(rules);
  }

  /**
   * Same as createFromPermissions but returns raw rules (serialisable).
   */
  toRawRules(
    allowed: { action: string; resource: string }[],
    denied: { action: string; resource: string }[] = [],
  ): CaslRule[] {
    const ability = this.createFromPermissions(allowed, denied);
    return ability.rules;
  }
}
