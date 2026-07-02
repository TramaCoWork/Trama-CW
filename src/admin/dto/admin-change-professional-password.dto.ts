import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  MinLength,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'matchesField', async: false })
class MatchesFieldConstraint implements ValidatorConstraintInterface {
  validate(value: string, args: ValidationArguments): boolean {
    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as Record<string, unknown>)[
      relatedPropertyName
    ];
    return typeof value === 'string' && value === relatedValue;
  }

  defaultMessage(args: ValidationArguments): string {
    const [relatedPropertyName] = args.constraints;
    return `${args.property} must match ${relatedPropertyName}`;
  }
}

export class AdminChangeProfessionalPasswordDto {
  @ApiProperty({ example: 'newPassword123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'newPassword123', minLength: 8 })
  @IsString()
  @MinLength(8)
  @Validate(MatchesFieldConstraint, ['password'])
  confirmPassword: string;
}
