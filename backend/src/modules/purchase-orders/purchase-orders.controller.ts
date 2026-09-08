import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('purchase-orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Get()
  findAll(@Query('supplierId') supplierId?: string) {
    return this.purchaseOrdersService.findAll(supplierId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.purchaseOrdersService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePurchaseOrderDto) {
    return this.purchaseOrdersService.create(dto);
  }

  @Patch(':id/receive')
  receive(@Param('id') id: string) {
    return this.purchaseOrdersService.receive(id);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.purchaseOrdersService.cancel(id);
  }

  @Patch(':id/payment-status')
  updatePaymentStatus(@Param('id') id: string, @Body('status') status: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID') {
    return this.purchaseOrdersService.updatePaymentStatus(id, status);
  }
}
