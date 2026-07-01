/**
 * Specification Pattern for reusable query criteria.
 */
export abstract class Specification<T> {
  abstract isSatisfiedBy(candidate: T): boolean;
  abstract toQuery(): Record<string, unknown>;

  and(spec: Specification<T>): Specification<T> {
    return new AndSpecification(this, spec);
  }

  or(spec: Specification<T>): Specification<T> {
    return new OrSpecification(this, spec);
  }

  not(): Specification<T> {
    return new NotSpecification(this);
  }
}

export class AndSpecification<T> extends Specification<T> {
  constructor(
    private readonly left: Specification<T>,
    private readonly right: Specification<T>,
  ) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) && this.right.isSatisfiedBy(candidate);
  }

  toQuery(): Record<string, unknown> {
    return { AND: [this.left.toQuery(), this.right.toQuery()] };
  }
}

export class OrSpecification<T> extends Specification<T> {
  constructor(
    private readonly left: Specification<T>,
    private readonly right: Specification<T>,
  ) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) || this.right.isSatisfiedBy(candidate);
  }

  toQuery(): Record<string, unknown> {
    return { OR: [this.left.toQuery(), this.right.toQuery()] };
  }
}

export class NotSpecification<T> extends Specification<T> {
  constructor(private readonly spec: Specification<T>) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    return !this.spec.isSatisfiedBy(candidate);
  }

  toQuery(): Record<string, unknown> {
    return { NOT: this.spec.toQuery() };
  }
}

/**
 * Concrete specification: filter by field value.
 */
export class FieldSpecification<T> extends Specification<T> {
  constructor(
    private readonly field: keyof T,
    private readonly value: unknown,
    private readonly operator: 'equals' | 'contains' | 'in' | 'gt' | 'gte' | 'lt' | 'lte' = 'equals',
  ) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    const val = candidate[this.field];
    switch (this.operator) {
      case 'equals': return val === this.value;
      case 'in': return Array.isArray(this.value) && this.value.includes(val);
      case 'contains': return String(val).includes(String(this.value));
      case 'gt': return Number(val) > Number(this.value);
      case 'gte': return Number(val) >= Number(this.value);
      case 'lt': return Number(val) < Number(this.value);
      case 'lte': return Number(val) <= Number(this.value);
      default: return false;
    }
  }

  toQuery(): Record<string, unknown> {
    if (this.operator === 'equals') {
      return { [this.field]: this.value };
    }
    return { [this.field]: { [this.operator]: this.value } };
  }
}
