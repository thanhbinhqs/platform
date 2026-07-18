import { IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkIdsDto {
  @ApiProperty({ description: 'Array of IDs to perform bulk action on' })
  @IsArray()
  @IsString({ each: true })
  ids!: string[];
}
