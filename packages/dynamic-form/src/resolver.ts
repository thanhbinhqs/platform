import { z } from 'zod';
import type { FieldDefinition } from './types';

export function zodResolver(fields: FieldDefinition[]) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    let schema: z.ZodTypeAny = z.string();

    if (field.type === 'email') schema = z.string().email(`${field.label} must be a valid email`);
    else if (field.type === 'number') schema = z.coerce.number();
    else if (field.type === 'password') schema = z.string();
    else if (field.type === 'select') schema = z.string();
    else if (field.type === 'textarea') schema = z.string(); // placeholder approach

    if (field.required) {
      schema = (schema as z.ZodString).min(1, `${field.label} is required`);
    }

    shape[field.name] = field.required ? schema : schema.optional();
  }

  return z.object(shape);
}

export type { FieldDefinition, FieldType } from './types';
