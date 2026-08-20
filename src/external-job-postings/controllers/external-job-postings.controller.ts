import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ExternalJobPostingsService } from '../services/external-job-postings.service';
import { ListExternalJobPostingsDto } from '../dto/list-external-job-postings.dto';

@ApiTags('External Job Postings')
@Controller('external-job-postings')
export class ExternalJobPostingsController {
  constructor(
    private readonly externalJobPostingsService: ExternalJobPostingsService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar ofertas de trabajo externas (usuarios autenticados)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'source', required: false, type: String })
  @ApiQuery({ name: 'categoryName', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Lista paginada de ofertas externas' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  list(@Query() filters: ListExternalJobPostingsDto) {
    return this.externalJobPostingsService.listPostings(filters);
  }
}
