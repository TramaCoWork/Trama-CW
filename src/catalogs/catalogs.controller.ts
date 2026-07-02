import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  CommunityImageEntityType,
  EducationLevel,
  WorkModality,
  WorkType,
  DocumentType,
  FrequencyType,
  SubscriptionStatus,
  UsageFrequency,
} from '@prisma/client';

@ApiTags('Catalogs')
@Controller('catalogs')
export class CatalogsController {
  @Get('education-levels')
  @ApiOperation({ summary: 'Listar niveles de educacion disponibles' })
  @ApiResponse({ status: 200, description: 'Array de niveles de educacion' })
  getEducationLevels(): string[] {
    return Object.values(EducationLevel);
  }

  @Get('work-modalities')
  @ApiOperation({ summary: 'Listar modalidades de trabajo disponibles' })
  @ApiResponse({ status: 200, description: 'Array de modalidades de trabajo' })
  getWorkModalities(): string[] {
    return Object.values(WorkModality);
  }

  @Get('work-types')
  @ApiOperation({ summary: 'Listar tipos de trabajo disponibles' })
  @ApiResponse({ status: 200, description: 'Array de tipos de trabajo' })
  getWorkTypes(): string[] {
    return Object.values(WorkType);
  }

  @Get('document-types')
  @ApiOperation({ summary: 'Listar tipos de documento disponibles' })
  @ApiResponse({ status: 200, description: 'Array de tipos de documento' })
  getDocumentTypes(): string[] {
    return Object.values(DocumentType);
  }

  @Get('usage-frequencies')
  @ApiOperation({ summary: 'Listar frecuencias de uso disponibles' })
  @ApiResponse({ status: 200, description: 'Array de frecuencias de uso' })
  getUsageFrequencies(): string[] {
    return Object.values(UsageFrequency);
  }

  @Get('community-image-entity-types')
  @ApiOperation({
    summary: 'Listar tipos de entidad para imagenes de comunidad',
  })
  @ApiResponse({
    status: 200,
    description: 'Array de tipos de entidad para imagenes de comunidad',
  })
  getCommunityImageEntityTypes(): string[] {
    return Object.values(CommunityImageEntityType);
  }

  @Get('frequency-types')
  @ApiOperation({ summary: 'Listar tipos de frecuencia disponibles' })
  @ApiResponse({ status: 200, description: 'Array de tipos de frecuencia' })
  getFrequencyTypes(): string[] {
    return Object.values(FrequencyType);
  }

  @Get('subscription-statuses')
  @ApiOperation({ summary: 'Listar estados de suscripcion disponibles' })
  @ApiResponse({ status: 200, description: 'Array de estados de suscripcion' })
  getSubscriptionStatuses(): string[] {
    return Object.values(SubscriptionStatus);
  }
}
