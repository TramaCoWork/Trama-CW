import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitLandingDto } from './dto/submit-landing.dto';

@Injectable()
export class LandingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicLanding(idSlug: string) {
    const { id, uuidSuffix } = this.parseIdSlug(idSlug);
    const landing = await this.prisma.landingPage.findFirst({
      where: { id, deletedAt: null },
      include: {
        fields: { orderBy: { order: 'asc' } },
      },
    });

    if (!landing || !this.isLandingPublicAndValid(landing) || !landing.uuid.endsWith(uuidSuffix)) {
      throw new NotFoundException();
    }

    return {
      id: landing.id,
      title: landing.title,
      body: landing.body,
      fields: landing.fields.map((field) => ({
        id: field.id,
        label: field.label,
        type: field.type,
        required: field.required,
        order: field.order,
        options: field.options,
      })),
    };
  }

  async submitLanding(idSlug: string, dto: SubmitLandingDto) {
    const { id, uuidSuffix } = this.parseIdSlug(idSlug);
    const landing = await this.prisma.landingPage.findFirst({
      where: { id, deletedAt: null },
      include: {
        fields: { orderBy: { order: 'asc' } },
      },
    });

    if (!landing || !this.isLandingPublicAndValid(landing) || !landing.uuid.endsWith(uuidSuffix)) {
      throw new NotFoundException();
    }

    this.validateRequiredFields(landing.fields, dto.data);

    await this.prisma.landingPageSubmission.create({
      data: {
        landingId: landing.id,
        data: dto.data,
      },
    });

    return { message: 'Formulario enviado correctamente' };
  }

  private isLandingPublicAndValid(landing: {
    isPublic: boolean;
    validFrom: Date | null;
    validUntil: Date | null;
  }): boolean {
    const now = new Date();

    if (!landing.isPublic) {
      return false;
    }

    if (landing.validFrom && landing.validFrom > now) {
      return false;
    }

    if (landing.validUntil && landing.validUntil < now) {
      return false;
    }

    return true;
  }

  private validateRequiredFields(
    fields: Array<{ label: string; required: boolean }>,
    data: Record<string, string>,
  ) {
    for (const field of fields) {
      if (!field.required) {
        continue;
      }

      const value = data[field.label];
      if (typeof value !== 'string' || value.trim().length === 0) {
        throw new BadRequestException(`El campo \"${field.label}\" es obligatorio`);
      }
    }
  }

  private parseIdSlug(idSlug: string): { id: number; uuidSuffix: string } {
    const dashIndex = idSlug.indexOf('-');
    if (dashIndex === -1) {
      throw new NotFoundException();
    }

    const id = parseInt(idSlug.substring(0, dashIndex), 10);
    const uuidSuffix = idSlug.substring(dashIndex + 1);

    if (Number.isNaN(id) || uuidSuffix.length !== 5) {
      throw new NotFoundException();
    }

    return { id, uuidSuffix };
  }
}
