import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already in use');
    const hashed = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: { ...dto, password: hashed },
    });
    const { password: _, ...result } = user;
    return result;
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return users.map(({ password: _, ...u }) => u);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id } });
    const { password: _, ...result } = user;
    return result;
  }

  async update(id: string, dto: UpdateUserDto) {
    if (dto.password) dto.password = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.update({
      where: { id },
      data: dto,
    });
    const { password: _, ...result } = user;
    return result;
  }

  async remove(id: string) {
    await this.prisma.user.findUniqueOrThrow({ where: { id } });
    return this.prisma.user.update({ where: { id }, data: { isActive: false } });
  }
}
