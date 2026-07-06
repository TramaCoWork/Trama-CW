import { Body, Controller, Get, Param, Post, ValidationPipe } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LandingsService } from './landings.service';
import { SubmitLandingDto } from './dto/submit-landing.dto';

@ApiTags('Landings')
@Controller('landings')
export class LandingsController {
  constructor(private readonly landingsService: LandingsService) {}

  @Get(':idSlug')
  @ApiOperation({ summary: 'Obtener landing pública por idSlug' })
  @ApiParam({ name: 'idSlug', description: 'Formato: {id}-{ultimos5uuid}' })
  @ApiResponse({ status: 200, description: 'Landing pública encontrada' })
  @ApiResponse({ status: 404, description: 'Landing no encontrada o no disponible' })
  getPublicLanding(@Param('idSlug') idSlug: string) {
    return this.landingsService.getPublicLanding(idSlug);
  }

  @Post(':idSlug/submit')
  @ApiOperation({ summary: 'Enviar formulario de una landing pública' })
  @ApiParam({ name: 'idSlug', description: 'Formato: {id}-{ultimos5uuid}' })
  @ApiResponse({ status: 201, description: 'Formulario enviado correctamente' })
  @ApiResponse({ status: 404, description: 'Landing no encontrada o no disponible' })
  submitLanding(
    @Param('idSlug') idSlug: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    dto: SubmitLandingDto,
  ) {
    return this.landingsService.submitLanding(idSlug, dto);
  }
}
