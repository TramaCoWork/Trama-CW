import { IsString, IsNotEmpty, IsUUID, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @IsUUID()
  postId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  content: string;
}
