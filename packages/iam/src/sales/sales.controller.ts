import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Permissions, CurrentUser } from '@platform/platform-kernel';
import { SalesService } from './sales.service';
import { BulkIdsDto } from '../common/dto/bulk-ids.dto';
import type { AuthenticatedUser } from '../common';

@ApiTags('Sales')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('sales')
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  // ─── Categories ───
  @Get('categories')
  @Permissions('read:products')
  @ApiOperation({ summary: 'List product categories' })
  async findAllCategories() { return this.sales.findAllCategories(); }

  @Post('categories')
  @Permissions('manage:settings')
  @ApiOperation({ summary: 'Create category' })
  async createCategory(@Body() b: any) { return this.sales.createCategory(b); }

  @Put('categories/:id')
  @Permissions('manage:settings')
  @ApiOperation({ summary: 'Update category' })
  async updateCategory(@Param('id') id: string, @Body() b: any) { return this.sales.updateCategory(id, b); }

  @Delete('categories/:id')
  @Permissions('manage:settings')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete category' })
  async deleteCategory(@Param('id') id: string) { return this.sales.deleteCategory(id); }

  // ─── Products ───
  @Get('products')
  @Permissions('read:products')
  @ApiOperation({ summary: 'List products (paginated)' })
  async findAllProducts(
    @Query('categoryId') cat?: string, @Query('status') status?: string,
    @Query('search') search?: string, @Query('page') page?: number, @Query('limit') limit?: number,
  ) { return this.sales.findAllProducts({ categoryId: cat, status, search, page, limit }); }

  @Get('products/:id')
  @Permissions('read:products')
  @ApiOperation({ summary: 'Get product detail' })
  async findProduct(@Param('id') id: string) { return this.sales.findProduct(id); }

  @Post('products')
  @Permissions('manage:settings')
  @ApiOperation({ summary: 'Create product' })
  async createProduct(@Body() b: any) { return this.sales.createProduct(b); }

  @Put('products/:id')
  @Permissions('manage:settings')
  @ApiOperation({ summary: 'Update product' })
  async updateProduct(@Param('id') id: string, @Body() b: any) { return this.sales.updateProduct(id, b); }

  @Post('products/:id/stock')
  @Permissions('manage:settings')
  @ApiOperation({ summary: 'Adjust stock (positive=add, negative=remove)' })
  async adjustStock(@Param('id') id: string, @Body() b: { delta: number }) { return this.sales.adjustStock(id, b.delta); }

  // ─── Orders ───
  @Get('orders')
  @Permissions('read:orders')
  @ApiOperation({ summary: 'List orders (paginated)' })
  async findAllOrders(@Query('status') status?: string, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.sales.findAllOrders({ status, page, limit });
  }

  @Get('orders/:id')
  @Permissions('read:orders')
  @ApiOperation({ summary: 'Get order detail with items & invoice' })
  async findOrder(@Param('id') id: string) { return this.sales.findOrder(id); }

  @Post('orders')
  @Permissions('manage:orders')
  @ApiOperation({ summary: 'Create order (with items, auto-calculates totals, reserves stock)' })
  async createOrder(@Body() b: any, @CurrentUser() u: AuthenticatedUser) { return this.sales.createOrder(b, u.id); }

  @Put('orders/:id/status')
  @Permissions('manage:orders')
  @ApiOperation({ summary: 'Update order status (auto-creates invoice on confirm)' })
  async updateOrderStatus(@Param('id') id: string, @Body() b: { status: string }) { return this.sales.updateOrderStatus(id, b.status); }

  // ─── Invoices ───
  @Get('invoices')
  @Permissions('read:invoices')
  @ApiOperation({ summary: 'List invoices (paginated)' })
  async findAllInvoices(@Query('status') status?: string, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.sales.findAllInvoices({ status, page, limit });
  }

  @Get('invoices/:id')
  @Permissions('read:invoices')
  @ApiOperation({ summary: 'Get invoice with payments' })
  async findInvoice(@Param('id') id: string) { return this.sales.findInvoice(id); }

  // ─── Payments ───
  @Post('payments')
  @Permissions('manage:invoices')
  @ApiOperation({ summary: 'Record payment against invoice (auto-updates invoice status)' })
  async recordPayment(@Body() b: any) { return this.sales.recordPayment(b); }

  // ─── Bulk Actions ───
  @Post('products/bulk/delete')
  @Permissions('manage:settings')
  @ApiOperation({ summary: 'Bulk delete products' })
  async bulkDeleteProducts(@Body() dto: BulkIdsDto) { return this.sales.bulkDeleteProducts(dto.ids); }

  @Post('orders/bulk/delete')
  @Permissions('manage:orders')
  @ApiOperation({ summary: 'Bulk cancel orders' })
  async bulkCancelOrders(@Body() dto: BulkIdsDto) { return this.sales.bulkCancelOrders(dto.ids); }

  @Post('invoices/bulk/delete')
  @Permissions('manage:invoices')
  @ApiOperation({ summary: 'Bulk cancel invoices' })
  async bulkCancelInvoices(@Body() dto: BulkIdsDto) { return this.sales.bulkCancelInvoices(dto.ids); }
}
