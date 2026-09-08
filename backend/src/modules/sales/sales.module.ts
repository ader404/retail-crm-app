import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { ImeiModule } from '../imei/imei.module';

@Module({
  imports: [NotificationsModule, ImeiModule],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
