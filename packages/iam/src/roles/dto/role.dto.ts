import { IsString, IsOptional, IsBoolean, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ example: 'Editor' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'Can edit content' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: ['user:read', 'content:write'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionNames?: string[];
}

export class AssignPermissionsDto {
  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  permissionIds!: string[];
}
