import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { SALT_ROUNDS } from '../common/constants/iam.constants';
import type { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor() {
    // Inject PrismaService when available
  }

  async create(dto: CreateUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    // TODO: Persist via Prisma
    this.logger.log(`Creating user: ${dto.email}`);
    return { id: 'placeholder-uuid', ...dto, passwordHash };
  }

  async findAll(query?: { page?: number; limit?: number }) {
    // TODO: Query with pagination
    return { data: [], total: 0, page: query?.page ?? 1, limit: query?.limit ?? 20 };
  }

  async findById(id: string) {
    // TODO: Query via Prisma
    return { id, username: 'placeholder', email: 'placeholder@example.com' };
  }

  async update(id: string, dto: UpdateUserDto) {
    // TODO: Update via Prisma
    return { id, ...dto };
  }

  async remove(id: string) {
    // TODO: Soft delete via Prisma
    return { deleted: true, id };
  }
}
