import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import type { Type } from '@nestjs/common';

/**
 * API response envelope.
 * Every response follows { success, data, meta, error }.
 */
export class ApiResponseDto<T = unknown> {
  @ApiProperty({ description: 'Operation success indicator' })
  success!: boolean;

  @ApiProperty({ description: 'Response payload' })
  data!: T;

  @ApiProperty({ required: false, description: 'Pagination metadata' })
  meta?: Record<string, unknown>;

  @ApiProperty({ required: false, description: 'Error details' })
  error?: ApiErrorDto;
}

export class ApiErrorDto {
  @ApiProperty({ description: 'Error code string' })
  code!: string;

  @ApiProperty({ description: 'Human-readable message' })
  message!: string;

  @ApiProperty({ required: false, description: 'Validation errors' })
  details?: Record<string, string[]>;
}

/**
 * Decorator factory for swagger paginated responses.
 */
export function ApiPaginatedResponse(model: Type<unknown>): MethodDecorator {
  return () => {};
}
