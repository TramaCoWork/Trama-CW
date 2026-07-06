import { PartialType } from '@nestjs/swagger';
import { CreateLandingDto } from './create-landing.dto';

export class UpdateLandingDto extends PartialType(CreateLandingDto) {}
