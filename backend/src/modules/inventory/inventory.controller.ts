import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { AdjustStockDto } from './dto/inventory.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get() findAll() { return this.inventoryService.findAll(); }
  @Get('low-stock') findLowStock() { return this.inventoryService.findLowStock(); }

  @Post('adjust') adjustStock(@Body() dto: AdjustStockDto) { return this.inventoryService.adjustStock(dto); }
  @Post('increment') incrementStock(@Body() dto: AdjustStockDto) { return this.inventoryService.incrementStock(dto); }
}
