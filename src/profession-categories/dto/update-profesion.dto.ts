import { PartialType } from '@nestjs/swagger';
import { CreateProfesionDto } from './create-profesion.dto';

export class UpdateProfesionDto extends PartialType(CreateProfesionDto) {}
