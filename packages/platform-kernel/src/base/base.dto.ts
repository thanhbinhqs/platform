import { ApiProperty } from '@nestjs/swagger';

/**
 * Base DTO: common fields for every response body.
 */
export class BaseDto {
  @ApiProperty({ description: 'UUID v4 primary key' })
  id!: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: Date;
}
