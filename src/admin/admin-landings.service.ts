import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLandingDto } from '../landings/dto/create-landing.dto';
import { UpdateLandingDto } from '../landings/dto/update-landing.dto';
import { CreateFieldDto } from '../landings/dto/create-field.dto';
import { UpdateFieldDto } from '../landings/dto/update-field.dto';

@Injectable()
export class AdminLandingsService {
  constructor(private readonly prisma: PrismaService) {}

  async createLanding(dto: CreateLandingDto) {
    return this.prisma.landingPage.create({
      data: {
        title: dto.title,
        body: dto.body,
        isPublic: dto.isPublic ?? false,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
      },
    });
  }

  async listLandings(page: number, limit: number) {
    const where = { deletedAt: null };
    const [data, total] = await Promise.all([
      this.prisma.landingPage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: {
              fields: true,
              submissions: true,
            },
          },
        },
      }),
      this.prisma.landingPage.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async getLanding(id: number) {
    const landing = await this.prisma.landingPage.findFirst({
      where: { id, deletedAt: null },
      include: {
        fields: { orderBy: { order: 'asc' } },
      },
    });

    if (!landing) {
      throw new NotFoundException('Landing no encontrada');
    }

    return landing;
  }

  async updateLanding(id: number, dto: UpdateLandingDto) {
    await this.ensureLandingExists(id);

    return this.prisma.landingPage.update({
      where: { id },
      data: {
        title: dto.title,
        body: dto.body,
        isPublic: dto.isPublic,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
      },
    });
  }

  async deleteLanding(id: number) {
    await this.ensureLandingExists(id);

    await this.prisma.landingPage.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: 'Landing eliminada correctamente' };
  }

  async addField(landingId: number, dto: CreateFieldDto) {
    await this.ensureLandingExists(landingId);

    const nextOrder = await this.resolveNextFieldOrder(landingId, dto.order);

    return this.prisma.landingPageField.create({
      data: {
        landingId,
        label: dto.label,
        type: dto.type,
        required: dto.required ?? false,
        order: nextOrder,
        options: dto.options ?? [],
      },
    });
  }

  async updateField(landingId: number, fieldId: number, dto: UpdateFieldDto) {
    await this.ensureLandingFieldExists(landingId, fieldId);

    return this.prisma.landingPageField.update({
      where: { id: fieldId },
      data: {
        label: dto.label,
        type: dto.type,
        required: dto.required,
        order: dto.order,
        options: dto.options,
      },
    });
  }

  async deleteField(landingId: number, fieldId: number) {
    await this.ensureLandingFieldExists(landingId, fieldId);

    await this.prisma.landingPageField.delete({ where: { id: fieldId } });

    return { message: 'Campo eliminado correctamente' };
  }

  async reorderFields(landingId: number, fieldIds: number[]) {
    await this.ensureLandingExists(landingId);

    if (fieldIds.length === 0) {
      throw new BadRequestException('fieldIds no puede estar vacío');
    }

    const distinctIds = new Set(fieldIds);
    if (distinctIds.size !== fieldIds.length) {
      throw new BadRequestException('fieldIds contiene IDs duplicados');
    }

    const fields = await this.prisma.landingPageField.findMany({
      where: { landingId },
      select: { id: true },
    });

    if (fields.length !== fieldIds.length) {
      throw new BadRequestException(
        'Debes enviar todos los campos de la landing para reordenar',
      );
    }

    const existingIds = new Set(fields.map((field) => field.id));
    const hasUnknownIds = fieldIds.some((id) => !existingIds.has(id));

    if (hasUnknownIds) {
      throw new BadRequestException('fieldIds contiene campos inválidos');
    }

    await this.prisma.$transaction(
      fieldIds.map((fieldId, index) =>
        this.prisma.landingPageField.update({
          where: { id: fieldId },
          data: { order: index + 1 },
        }),
      ),
    );

    return { message: 'Campos reordenados correctamente' };
  }

  async listSubmissions(landingId: number, page: number, limit: number) {
    await this.ensureLandingExists(landingId);

    const where = { landingId };
    const [data, total] = await Promise.all([
      this.prisma.landingPageSubmission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.landingPageSubmission.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async deleteSubmission(landingId: number, submissionId: number) {
    await this.ensureLandingExists(landingId);

    const deleted = await this.prisma.landingPageSubmission.deleteMany({
      where: {
        id: submissionId,
        landingId,
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('Envío no encontrado');
    }

    return { message: 'Envío eliminado correctamente' };
  }

  private async ensureLandingExists(id: number) {
    const landing = await this.prisma.landingPage.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (!landing) {
      throw new NotFoundException('Landing no encontrada');
    }
  }

  private async ensureLandingFieldExists(landingId: number, fieldId: number) {
    await this.ensureLandingExists(landingId);

    const field = await this.prisma.landingPageField.findFirst({
      where: { id: fieldId, landingId },
      select: { id: true },
    });

    if (!field) {
      throw new NotFoundException('Campo no encontrado');
    }
  }

  private async resolveNextFieldOrder(landingId: number, explicitOrder?: number) {
    if (typeof explicitOrder === 'number') {
      return explicitOrder;
    }

    const lastField = await this.prisma.landingPageField.findFirst({
      where: { landingId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    return (lastField?.order ?? 0) + 1;
  }
}
