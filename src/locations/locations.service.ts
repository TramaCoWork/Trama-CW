import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllCountries() {
    return this.prisma.country.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true },
    });
  }

  async findProvincesByCountry(countryId: number) {
    return this.prisma.province.findMany({
      where: { countryId, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, countryId: true },
    });
  }
}
