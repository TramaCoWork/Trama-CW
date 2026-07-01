import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCommunityChannelPostDto {
  @IsString()
  @IsNotEmpty()
  content: string;
}
