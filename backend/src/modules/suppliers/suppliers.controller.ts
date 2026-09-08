import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  findAll(@Query() paginationDto: PaginationDto) {
    return this.suppliersService.findAll(paginationDto);
  }

  @Get(':id') findOne(@Param('id') id: string) { return this.suppliersService.findOne(id); }

  @Get(':id/ledger')
  getSupplierLedger(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.suppliersService.getSupplierLedger(
      id,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get(':id/history')
  getSupplierHistory(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.suppliersService.getSupplierHistory(
      id,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Post() create(@Body() dto: CreateSupplierDto) { return this.suppliersService.create(dto); }
  @Post('payments') createPayment(@Body() dto: CreateSupplierPaymentDto) { return this.suppliersService.createPayment(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: Partial<CreateSupplierDto>) { return this.suppliersService.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.suppliersService.remove(id); }
}
