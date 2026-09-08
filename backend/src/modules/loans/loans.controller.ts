import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { LoansService } from './loans.service';
import { CreateLoanDto } from './dto/create-loan.dto';
import { CreateLoanPaymentDto } from './dto/create-loan-payment.dto';
import { LoansQueryDto } from './dto/loans-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('loans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('loans')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Get()
  findAll(@Query() queryDto: LoansQueryDto) {
    return this.loansService.findAll(queryDto);
  }

  @Get('summary')
  getSummary(@Query('type') type?: string) {
    return this.loansService.getSummary(type);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.loansService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateLoanDto) {
    return this.loansService.create(dto);
  }

  @Post('payments')
  createPayment(@Body() dto: CreateLoanPaymentDto) {
    return this.loansService.createPayment(dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: 'ACTIVE' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED',
  ) {
    return this.loansService.updateStatus(id, status);
  }
}
