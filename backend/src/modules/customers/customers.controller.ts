import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { RecordCustomerPaymentDto } from './dto/record-customer-payment.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  findAll(@Query() paginationDto: PaginationDto) {
    return this.customersService.findAll(paginationDto);
  }

  @Get(':id') findOne(@Param('id') id: string) { return this.customersService.findOne(id); }

  @Get(':id/ledger')
  getCustomerLedger(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.customersService.getCustomerLedger(
      id,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get(':id/history')
  getCustomerHistory(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.customersService.getCustomerHistory(
      id,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Post(':id/payments')
  recordPayment(@Param('id') id: string, @Body() dto: RecordCustomerPaymentDto) {
    return this.customersService.recordPayment(id, dto);
  }

  @Post() create(@Body() dto: CreateCustomerDto) { return this.customersService.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: Partial<CreateCustomerDto>) { return this.customersService.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.customersService.remove(id); }
}
