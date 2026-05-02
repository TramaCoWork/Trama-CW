import { IsString, IsOptional, IsUUID, MaxLength } from 'class-validator';

export class ApplyJobDto {
  @IsUUID()
  jobId: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  coverLetter?: string;
}
