import { Module } from '@nestjs/common';
import { ImeiController } from './imei.controller';
import { ImeiService } from './imei.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ImeiController],
  providers: [ImeiService],
  exports: [ImeiService],
})
export class ImeiModule {}
