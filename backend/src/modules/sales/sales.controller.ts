import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { AddPaymentDto } from './dto/add-payment.dto';
import { SalesQueryDto } from './dto/sales-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('sales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  findAll(@Query() queryDto: SalesQueryDto) {
    return this.salesService.findAll(queryDto);
  }

  @Get(':id') findOne(@Param('id') id: string) { return this.salesService.findOne(id); }

  @Get('deleted/list')
  findDeleted(@Query() queryDto: SalesQueryDto) {
    return this.salesService.findDeleted(queryDto);
  }

  @Post() create(@Body() dto: CreateSaleDto) { return this.salesService.create(dto); }
  @Post('payments') addPayment(@Body() dto: AddPaymentDto) { return this.salesService.addPayment(dto); }
  @Patch(':id/refund') refund(@Param('id') id: string) { return this.salesService.refund(id); }

  @Patch(':id/restore')
  restore(@Param('id') id: string) {
    return this.salesService.restore(id);
  }

  @Delete(':id') delete(@Param('id') id: string) { return this.salesService.delete(id); }
  @Patch(':id/payment-status') updatePaymentStatus(
    @Param('id') id: string,
    @Body('status') status: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID',
  ) {
    return this.salesService.updatePaymentStatus(id, status);
  }
}
