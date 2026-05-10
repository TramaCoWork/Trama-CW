import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PostStatus } from '@prisma/client';

export class UpdatePostStatusDto {
  @ApiProperty({ enum: PostStatus, example: 'paused', description: 'Nuevo estado del post: published o paused' })
  @IsEnum(PostStatus)
  status: PostStatus;
}
