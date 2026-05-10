import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LocationsService } from './locations.service';

@ApiTags('Locations')
@Controller('locations')
export class LocationsController {
  constructor(private readonly service: LocationsService) {}

  @Get('countries')
  @ApiOperation({ summary: 'Listar países activos (público)' })
  findAllCountries() {
    return this.service.findAllCountries();
  }

  @Get('countries/:countryId/provinces')
  @ApiOperation({ summary: 'Listar provincias de un país (público)' })
  findProvinces(@Param('countryId', ParseIntPipe) countryId: number) {
    return this.service.findProvincesByCountry(countryId);
  }
}
