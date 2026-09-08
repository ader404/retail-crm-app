import { Module } from '@nestjs/common';
import { ChequesController } from './cheques.controller';
import { ChequesService } from './cheques.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [ChequesController],
  providers: [ChequesService],
  exports: [ChequesService],
})
export class ChequesModule {}
