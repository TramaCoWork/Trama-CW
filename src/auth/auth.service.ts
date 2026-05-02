import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ProfessionalRegisterDto } from './dto/professional-register.dto';
import { User, UserRole, ProfileStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export interface TokenResponse {
  access_token: string;
  userId: string;
}

interface JwtUserPayload {
  sub: string;
  email: string;
  role: UserRole;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<TokenResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        role: dto.role ?? UserRole.client,
      },
    });

    return this.generateToken(user);
  }

  async login(dto: LoginDto): Promise<TokenResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email, role: UserRole.professional },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateToken(user);
  }

  async professionalRegister(
    dto: ProfessionalRegisterDto,
  ): Promise<TokenResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        role: UserRole.professional,
        profile: {
          create: {
            name: dto.name,
            city: dto.city,
            whatsapp: dto.whatsapp,
            services: [],
            profileStatus: ProfileStatus.onboarding,
          },
        },
      },
      include: { profile: true },
    });

    if (dto.categories?.length) {
      await this.prisma.professionalProfile.update({
        where: { id: user.profile!.id },
        data: {
          categories: {
            connect: dto.categories.map((id) => ({ id })),
          },
        },
      });
    }

    return this.generateToken(user);
  }

  private generateToken(user: User): TokenResponse {
    const payload: JwtUserPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      userId: user.id,
    };
  }
}
