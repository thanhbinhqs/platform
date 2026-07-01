import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { isValidUuid } from '../helpers/uuid.helper';

/**
 * Validates and transforms UUID parameters.
 */
@Injectable()
export class ParseUUIDPipe implements PipeTransform<string> {
  constructor(private readonly version?: 4 | 7) {}

  transform(value: string): string {
    if (!value) {
      throw new BadRequestException('UUID parameter is required');
    }

    if (!isValidUuid(value)) {
      throw new BadRequestException(`Invalid UUID: ${value}`);
    }

    return value;
  }
}
