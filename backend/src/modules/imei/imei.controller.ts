import { Controller, Get, Post, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ImeiService } from './imei.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('imei')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('imei')
export class ImeiController {
  constructor(private readonly imeiService: ImeiService) {}

  @Get('product/:productId')
  findByProduct(@Param('productId') productId: string) {
    return this.imeiService.findByProduct(productId);
  }

  @Get('product/:productId/available')
  findAvailable(@Param('productId') productId: string) {
    return this.imeiService.findAvailable(productId);
  }

  @Get('product/:productId/stats')
  getStats(@Param('productId') productId: string) {
    return this.imeiService.getStats(productId);
  }

  @Post('product/:productId')
  register(@Param('productId') productId: string, @Body() body: { imeis: string[] }) {
    return this.imeiService.register(productId, body.imeis);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.imeiService.remove(id);
  }

  @Get('search')
  search(@Query('q') query: string) {
    return this.imeiService.search(query);
  }

  @Post('validate')
  validate(@Body() body: { imeis: string[] }) {
    return this.imeiService.validateUniqueness(body.imeis);
  }
}
