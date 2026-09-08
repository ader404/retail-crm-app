import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { ExpensesService } from './expenses.service'
import { CreateExpenseDto } from './dto/create-expense.dto'
import { ExpensesQueryDto } from './dto/expenses-query.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

@ApiTags('expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  create(@Body() dto: CreateExpenseDto) { return this.expensesService.create(dto) }

  @Get()
  findAll(@Query() queryDto: ExpensesQueryDto) {
    return this.expensesService.findAll(queryDto)
  }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.expensesService.findOne(id) }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateExpenseDto>) { return this.expensesService.update(id, dto) }

  @Delete(':id')
  delete(@Param('id') id: string) { return this.expensesService.delete(id) }
}
