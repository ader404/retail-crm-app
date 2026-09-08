import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ChequesService } from './cheques.service';
import { CreateChequeDto } from './dto/create-cheque.dto';
import { UpdateChequeDto } from './dto/update-cheque.dto';
import { ChangeChequeStatusDto } from './dto/change-cheque-status.dto';
import { ChequesQueryDto } from './dto/cheques-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/user.decorator';

@ApiTags('cheques')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cheques')
export class ChequesController {
  constructor(private readonly chequesService: ChequesService) {}

  @Get()
  findAll(@Query() queryDto: ChequesQueryDto) {
    return this.chequesService.findAll(queryDto);
  }

  @Get('summary')
  getSummary() {
    return this.chequesService.getSummary();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.chequesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateChequeDto, @GetUser() user: any) {
    return this.chequesService.create({ ...dto, userId: user.id });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateChequeDto, @GetUser() user: any) {
    return this.chequesService.update(id, dto, user.id);
  }

  @Patch(':id/status')
  changeStatus(@Param('id') id: string, @Body() dto: ChangeChequeStatusDto, @GetUser() user: any) {
    return this.chequesService.changeStatus(id, dto, user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.chequesService.remove(id);
  }
}
