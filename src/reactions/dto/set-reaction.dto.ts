import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReactionType } from '@prisma/client';

export class SetReactionDto {
  @ApiProperty({ enum: ReactionType })
  @IsEnum(ReactionType, { message: 'Reacción no válida.' })
  type!: ReactionType;
}
