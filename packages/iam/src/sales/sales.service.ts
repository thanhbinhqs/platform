import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@platform/platform-core';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);
  constructor(private readonly prisma: PrismaService) {}

  async generateOrderNumber(): Promise<string> {
    const date = new Date();
    const prefix = `ORD${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const last = await this.prisma.client.order.findFirst({ where: { orderNumber: { startsWith: prefix } }, orderBy: { orderNumber: 'desc' } } as any);
    const seq = last ? String(Number(last.orderNumber.slice(-4)) + 1).padStart(4, '0') : '0001';
    return `${prefix}${seq}`;
  }

  async generateInvoiceNumber(): Promise<string> {
    const date = new Date();
    const prefix = `INV${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const last = await this.prisma.client.invoice.findFirst({ where: { invoiceNumber: { startsWith: prefix } }, orderBy: { invoiceNumber: 'desc' } } as any);
    const seq = last ? String(Number(last.invoiceNumber.slice(-4)) + 1).padStart(4, '0') : '0001';
    return `${prefix}${seq}`;
  }

  async findAllProducts(q?: { categoryId?: string; status?: string; search?: string; page?: number; limit?: number }): Promise<any> {
    const page = q?.page ?? 1;
    const limit = Math.min(q?.limit ?? 50, 200);
    const where: any = {};
    if (q?.categoryId) where.categoryId = q.categoryId;
    if (q?.status) where.status = q.status;
    if (q?.search) where.OR = [{ name: { contains: q.search, mode: 'insensitive' } }, { sku: { contains: q.search, mode: 'insensitive' } }];
    const [items, total] = await Promise.all([
      this.prisma.client.product.findMany({ where, include: { category: true }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit } as any),
      this.prisma.client.product.count({ where }),
    ]);
    return { data: items as any[], total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findProduct(id: string): Promise<any> {
    const p = await this.prisma.client.product.findUnique({ where: { id }, include: { category: true } } as any);
    if (!p) throw new NotFoundException('Product not found');
    return p;
  }

  async createProduct(data: any): Promise<any> {
    return this.prisma.client.product.create({ data: { name: data.name, sku: data.sku, description: data.description, price: data.price, compareAt: data.compareAt, costPrice: data.costPrice, unit: data.unit || 'piece', stock: data.stock ?? 0, lowStock: data.lowStock ?? 5, imageUrl: data.imageUrl, status: data.status || 'ACTIVE', tags: data.tags || [], categoryId: data.categoryId } } as any);
  }

  async updateProduct(id: string, data: any): Promise<any> {
    await this.findProduct(id);
    return this.prisma.client.product.update({ where: { id }, data } as any);
  }

  async adjustStock(id: string, delta: number): Promise<any> {
    const product = await this.findProduct(id);
    const newStock = Number(product.stock) + delta;
    if (newStock < 0) throw new BadRequestException('Insufficient stock');
    return this.prisma.client.product.update({ where: { id }, data: { stock: newStock } } as any);
  }

  async findAllCategories(): Promise<any> {
    return this.prisma.client.productCategory.findMany({ include: { _count: { select: { products: true } } }, orderBy: { sortOrder: 'asc' } } as any);
  }

  async createCategory(data: any): Promise<any> {
    return this.prisma.client.productCategory.create({ data: { name: data.name, description: data.description, icon: data.icon, sortOrder: data.sortOrder ?? 0 } } as any);
  }

  async updateCategory(id: string, data: any): Promise<any> {
    return this.prisma.client.productCategory.update({ where: { id }, data } as any);
  }

  async deleteCategory(id: string): Promise<any> {
    return this.prisma.client.productCategory.delete({ where: { id } } as any);
  }

  async findAllOrders(q?: { status?: string; page?: number; limit?: number }): Promise<any> {
    const page = q?.page ?? 1;
    const limit = Math.min(q?.limit ?? 50, 200);
    const where: any = {};
    if (q?.status) where.status = q.status;
    const [items, total] = await Promise.all([
      this.prisma.client.order.findMany({ where, include: { items: true, invoice: true, user: { select: { id: true, username: true, displayName: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit } as any),
      this.prisma.client.order.count({ where }),
    ]);
    return { data: items as any[], total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOrder(id: string): Promise<any> {
    const o = await this.prisma.client.order.findUnique({ where: { id }, include: { items: { include: { product: true } }, invoice: { include: { payments: true } }, user: { select: { id: true, username: true, displayName: true } } } } as any);
    if (!o) throw new NotFoundException('Order not found');
    return o;
  }

  async createOrder(data: any, userId?: string): Promise<any> {
    const orderNumber = await this.generateOrderNumber();
    const items = data.items || [];
    if (!items.length) throw new BadRequestException('Order must have at least one item');
    let subtotal = 0;
    const orderItems = [];
    for (const item of items) {
      let unitPrice = item.unitPrice;
      if (item.productId) {
        const product: any = await this.findProduct(item.productId);
        unitPrice = unitPrice || Number(product.price);
        if (Number(product.stock) < item.quantity) throw new BadRequestException(`Insufficient stock for ${product.name}`);
        await this.adjustStock(item.productId, -item.quantity);
      }
      const total = Number(unitPrice) * item.quantity;
      subtotal += total;
      orderItems.push({ productId: item.productId || null, name: item.name || 'Product', sku: item.sku || null, quantity: item.quantity, unitPrice, total });
    }
    const tax = Number(data.tax ?? 0);
    const shipping = Number(data.shipping ?? 0);
    const discount = Number(data.discount ?? 0);
    const total = subtotal + tax + shipping - discount;
    const order = await this.prisma.client.order.create({
      data: { orderNumber, userId: userId || data.userId || null, customerName: data.customerName, customerEmail: data.customerEmail, customerPhone: data.customerPhone, customerAddress: data.customerAddress, notes: data.notes, status: 'PENDING', subtotal, tax, shipping, discount, total, items: { create: orderItems } },
      include: { items: true },
    } as any);
    this.logger.log(`Order ${orderNumber} created (total: ${total})`);
    return order;
  }

  async updateOrderStatus(id: string, status: string): Promise<any> {
    const order: any = await this.findOrder(id);
    const validTransitions: Record<string, string[]> = { PENDING: ['CONFIRMED', 'CANCELLED'], CONFIRMED: ['PROCESSING', 'CANCELLED'], PROCESSING: ['SHIPPED', 'CANCELLED'], SHIPPED: ['DELIVERED', 'CANCELLED'], DELIVERED: ['REFUNDED'], CANCELLED: [], REFUNDED: [] };
    const allowed = validTransitions[order.status] || [];
    if (!allowed.includes(status)) throw new BadRequestException(`Cannot transition from ${order.status} to ${status}`);
    if (status === 'CONFIRMED' && !order.invoice) {
      const invoiceNumber = await this.generateInvoiceNumber();
      await this.prisma.client.invoice.create({ data: { orderId: id, invoiceNumber, status: 'SENT', amount: Number(order.total), dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) } } as any);
    }
    return this.prisma.client.order.update({ where: { id }, data: { status }, include: { items: true, invoice: true } } as any);
  }

  async findAllInvoices(q?: { status?: string; page?: number; limit?: number }): Promise<any> {
    const page = q?.page ?? 1;
    const limit = Math.min(q?.limit ?? 50, 200);
    const where: any = {};
    if (q?.status) where.status = q.status;
    const [items, total] = await Promise.all([
      this.prisma.client.invoice.findMany({ where, include: { order: { select: { orderNumber: true, customerName: true } }, payments: true }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit } as any),
      this.prisma.client.invoice.count({ where }),
    ]);
    return { data: items as any[], total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findInvoice(id: string): Promise<any> {
    const inv = await this.prisma.client.invoice.findUnique({ where: { id }, include: { order: { include: { items: true } }, payments: true } } as any);
    if (!inv) throw new NotFoundException('Invoice not found');
    return inv;
  }

  async recordPayment(data: { invoiceId: string; amount: number; method?: string; transactionId?: string; reference?: string; notes?: string }): Promise<any> {
    const invoice: any = await this.findInvoice(data.invoiceId);
    const paidAmount = Number(invoice.paidAmount) + Number(data.amount);
    const totalAmount = Number(invoice.amount);
    const payment = await this.prisma.client.payment.create({ data: { invoiceId: data.invoiceId, amount: data.amount, method: data.method || 'CASH', status: 'COMPLETED', transactionId: data.transactionId, reference: data.reference, notes: data.notes, paidAt: new Date() } } as any);
    const newStatus = paidAmount >= totalAmount ? 'PAID' : 'PARTIALLY_PAID';
    await this.prisma.client.invoice.update({ where: { id: data.invoiceId }, data: { status: newStatus, paidAmount, paidAt: newStatus === 'PAID' ? new Date() : undefined } } as any);
    this.logger.log(`Payment of ${data.amount} recorded for invoice ${invoice.invoiceNumber}`);
    return payment;
  }
}