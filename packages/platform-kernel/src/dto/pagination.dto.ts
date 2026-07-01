import { ApiProperty } from '@nestjs/swagger';

/**
 * Generic paginated response wrapper.
 * Used by both cursor-based and offset-based pagination.
 */
export class PaginatedDto<T> {
  readonly data: T[];

  @ApiProperty({ description: 'Pagination metadata' })
  readonly meta: PaginationMeta;

  constructor(data: T[], meta: PaginationMeta) {
    this.data = data;
    this.meta = meta;
  }
}

export class PaginationMeta {
  @ApiProperty({ description: 'Total item count (null for cursor pagination)' })
  total?: number;

  @ApiProperty({ description: 'Items per page' })
  limit!: number;

  @ApiProperty({ description: 'Current offset / cursor page' })
  page?: number;

  @ApiProperty({ description: 'Cursor for next page (null = no more)' })
  nextCursor?: string | null;

  @ApiProperty({ description: 'Whether there are more results' })
  hasMore!: boolean;
}
