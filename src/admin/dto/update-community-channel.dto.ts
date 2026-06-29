import { PartialType } from '@nestjs/swagger';
import { CreateCommunityChannelDto } from './create-community-channel.dto';

export class UpdateCommunityChannelDto extends PartialType(
  CreateCommunityChannelDto,
) {}
