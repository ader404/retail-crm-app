import { Injectable, ConflictException, BadRequestException } from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import * as mysql from 'mysql2/promise'
import { PrismaService } from '../../prisma/prisma.service'
import { BootstrapAdminDto } from './dto/bootstrap-admin.dto'
import { TestConnectionDto } from './dto/test-connection.dto'

@Injectable()
export class SetupService {
  constructor(private readonly prisma: PrismaService) {}

  async status() {
    const userCount = await this.prisma.user.count()
    return { isComplete: userCount > 0 }
  }

  async bootstrapAdmin(dto: BootstrapAdminDto) {
    const hashed = await bcrypt.hash(dto.password, 12)

    // Re-check inside a transaction so two concurrent requests can't both
    // pass the controller-level check and each create an admin.
    const user = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.user.count()
      if (existing > 0) throw new ConflictException('Setup already completed — an administrator account already exists')

      return tx.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          password: hashed,
          role: 'SUPER_ADMIN',
        },
      })
    })

    const { password: _password, ...result } = user
    return result
  }

  async testConnection(dto: TestConnectionDto) {
    let connection: mysql.Connection | null = null
    try {
      connection = await mysql.createConnection({
        host: dto.host,
        port: dto.port,
        user: dto.user,
        password: dto.password || '',
        database: dto.database,
        connectTimeout: 5000,
      })
      await connection.ping()
      return { success: true, message: 'Connection successful' }
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Connection failed')
    } finally {
      if (connection) await connection.end()
    }
  }
}
