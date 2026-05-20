import { PartialType } from '@nestjs/swagger';
import { CreateSubrubroDto } from './create-subrubro.dto';

export class UpdateSubrubroDto extends PartialType(CreateSubrubroDto) {}
