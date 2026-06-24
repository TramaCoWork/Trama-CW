import { PartialType } from '@nestjs/swagger';
import { CreateDiscountPlanDto } from './create-discount-plan.dto';

export class UpdateDiscountPlanDto extends PartialType(CreateDiscountPlanDto) {}
