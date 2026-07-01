import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

/**
 * Validation pipe using Zod schemas.
 * Usage: @Body(new ZodValidationPipe(createUserSchema)) body: CreateUserDto
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown): unknown {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      const errors = (result.error as ZodError).errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      }));

      throw new BadRequestException({
        message: 'Validation failed',
        details: errors.reduce(
          (acc, curr) => {
            (acc[curr.path] ??= []).push(curr.message);
            return acc;
          },
          {} as Record<string, string[]>,
        ),
      });
    }

    return result.data;
  }
}
