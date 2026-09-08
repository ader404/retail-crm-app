import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  log(userId: string, action: string, entity: string, entityId?: string, details?: object) {
    return this.prisma.auditLog.create({ data: { userId, action, entity, entityId, details: details ?? undefined } });
  }

  findAll() {
    return this.prisma.auditLog.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
