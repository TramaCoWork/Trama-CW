import { ApiProperty } from '@nestjs/swagger';

export class ProfessionalDashboardDto {
  @ApiProperty()
  totalContacts: number;

  @ApiProperty()
  totalEducations: number;

  @ApiProperty()
  totalCertifications: number;

  @ApiProperty()
  totalDocuments: number;

  @ApiProperty()
  totalMessages: number;

  @ApiProperty()
  totalCommunityPosts: number;

  @ApiProperty()
  totalJobApplications: number;

  @ApiProperty()
  totalValidations: number;

  @ApiProperty({ required: false, nullable: true })
  planName: string | null;

  @ApiProperty({ required: false, nullable: true, type: String, format: 'date-time' })
  planExpirationDate: Date | null;

  @ApiProperty({ required: false, nullable: true, type: String, format: 'date-time' })
  trialEndDate: Date | null;

  @ApiProperty()
  isOnTrial: boolean;
}
