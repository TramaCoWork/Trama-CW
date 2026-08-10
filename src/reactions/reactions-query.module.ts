import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ReactionsQueryService } from './reactions-query.service';

@Module({
  imports: [PrismaModule],
  providers: [ReactionsQueryService],
  exports: [ReactionsQueryService],
})
export class ReactionsQueryModule {}
