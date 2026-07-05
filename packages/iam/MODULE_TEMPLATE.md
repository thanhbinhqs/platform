# Module Development Template (MDT)
## Standard pattern for creating backend modules compatible with CustomDataGrid

## 📁 Structure

```
src/your-module/
├── your-module.controller.ts    # Routes + request handling
├── your-module.service.ts       # Business logic (optional)
├── your-module.module.ts        # NestJS module wiring
├── dto/
│   ├── create-your-module.dto.ts
│   └── update-your-module.dto.ts
```

## 📋 Controller Pattern

```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '@platform/platform-core';
import { Permissions } from '@platform/platform-kernel';

@ApiTags('Your Modules')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('your-modules')
export class YourModuleController {
  constructor(private readonly prisma: PrismaService) {}

  // ─── LIST (paginated + searchable + sortable) ──────────────────
  @Get()
  @Permissions('manage:your-module')
  @ApiOperation({ summary: 'List with pagination, search, sort' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('sortField') sortField?: string,
    @Query('sortDir') sortDir?: string,
  ): Promise<any> {
    const pg = Math.max(1, Number(page) || 1);
    const ps = Math.min(100, Math.max(1, Number(limit) || 20));
    const sk = (pg - 1) * ps;
    const wh: any = {};
    if (search) wh.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
    const ob: any = sortField
      ? { [sortField]: (sortDir || 'asc') as any }
      : { createdAt: 'desc' };
    const [data, total] = await Promise.all([
      this.prisma.client.yourModel.findMany({ where: wh, skip: sk, take: ps, orderBy: ob }),
      this.prisma.client.yourModel.count({ where: wh }),
    ]);
    return { data, total, page: pg, pageSize: ps, totalPages: Math.ceil(total / ps) };
  }

  // ─── GET BY ID ──────────────────────────────────────────────────
  @Get(':id')
  @Permissions('manage:your-module')
  @ApiOperation({ summary: 'Get by ID' })
  async findOne(@Param('id') id: string): Promise<any> {
    return this.prisma.client.yourModel.findUnique({ where: { id } });
  }

  // ─── CREATE ─────────────────────────────────────────────────────
  @Post()
  @Permissions('manage:your-module')
  @ApiOperation({ summary: 'Create' })
  async create(@Body() data: any): Promise<any> {
    return this.prisma.client.yourModel.create({ data });
  }

  // ─── UPDATE ─────────────────────────────────────────────────────
  @Put(':id')
  @Permissions('manage:your-module')
  @ApiOperation({ summary: 'Update' })
  async update(@Param('id') id: string, @Body() data: any): Promise<any> {
    return this.prisma.client.yourModel.update({ where: { id }, data });
  }

  // ─── DELETE ─────────────────────────────────────────────────────
  @Delete(':id')
  @Permissions('manage:your-module')
  @ApiOperation({ summary: 'Delete' })
  async remove(@Param('id') id: string): Promise<any> {
    return this.prisma.client.yourModel.delete({ where: { id } });
  }
}
```

## 📦 Response Format (GridResponse)

All `findAll`/list endpoints MUST return:

```json
{
  "success": true,
  "data": {
    "data": [{ ... }],        // Array of items
    "total": 42,              // Total count (for pagination)
    "page": 1,                // Current page
    "pageSize": 20,           // Items per page
    "totalPages": 3           // Total pages
  }
}
```

The outer `{ success, data }` is added automatically by `TransformInterceptor`.

## 🔍 Query Parameters

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | number | 1 | Page number (1-indexed) |
| `limit` | number | 20 | Items per page (max 100) |
| `search` | string | — | Global text search (OR across name, description) |
| `sortField` | string | `createdAt` | Column to sort by |
| `sortDir` | `asc` \| `desc` | `desc` | Sort direction |

## 📝 Module .module.ts

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from '@platform/platform-core';
import { YourModuleController } from './your-module.controller';

@Module({ imports: [PrismaModule], controllers: [YourModuleController] })
export class YourModuleModule {}
```

## 🔗 Wiring in IAM Module

In `iam.module.ts`:
```typescript
import { YourModuleModule } from './your-module/your-module.module';

@Module({
  imports: [
    // ...
    YourModuleModule,
  ],
})
export class IamModule {}
```

## 🧪 Verifying with DataGrid

```tsx
import { CustomDataGrid, RestDataSource } from '@platform/ui';

const dataSource = new RestDataSource<YourType>('/your-modules');

<CustomDataGrid
  columns={columns}
  dataSource={dataSource}
  features={{
    enablePagination: true,
    enableSorting: true,
    enableFilter: true,
  }}
/>
```
