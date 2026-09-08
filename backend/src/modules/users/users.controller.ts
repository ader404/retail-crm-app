import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PageAccessGuard } from '../../common/guards/page-access.guard';
import { GetUser } from '../../common/decorators/user.decorator';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() dto: CreateUserDto, @GetUser() user: any) {
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      throw new ForbiddenException('Only administrators can create users');
    }
    return this.usersService.create(dto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto, @GetUser() user: any) {
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      throw new ForbiddenException('Only administrators can update users');
    }
    if (dto.pageAccess !== undefined && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only the owner can modify page access');
    }
    if (id === user.id && dto.pageAccess !== undefined) {
      throw new ForbiddenException('Cannot modify your own page access');
    }
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @GetUser() user: any) {
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      throw new ForbiddenException('Only administrators can delete users');
    }
    if (id === user.id) {
      throw new ForbiddenException('Cannot deactivate your own account');
    }
    return this.usersService.remove(id);
  }
}
