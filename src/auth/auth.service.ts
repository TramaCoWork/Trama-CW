import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ProfessionalRegisterDto } from './dto/professional-register.dto';
import { User, UserRole, ProfileStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

export interface TokenResponse {
  access_token: string;
  userId: string;
}

interface JwtUserPayload {
  sub: string;
  email: string;
  role: UserRole;
}

interface VerificationPayload {
  sub: string;
  purpose: 'email-verification';
}

@Injectable()
export class AuthService {
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:4321');
  }

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

    // Fire-and-forget verification email
    this.sendVerificationEmail(user.id, user.email);

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

    if (!user.emailVerified) {
      throw new ForbiddenException(
        'Debes verificar tu email antes de iniciar sesion. Revisa tu bandeja de entrada.',
      );
    }

    // Verificar si el trial expiró y desactivar perfil
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { userId: user.id },
    });

    if (
      profile &&
      profile.profileStatus === 'active' &&
      profile.trialEndDate &&
      profile.trialEndDate < new Date()
    ) {
      await this.prisma.professionalProfile.update({
        where: { id: profile.id },
        data: {
          profileStatus: 'waiting_payment',
          isActive: false,
          trialEndDate: null,
        },
      });
    }

    return this.generateToken(user);
  }

  async adminLogin(dto: LoginDto): Promise<TokenResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email, role: UserRole.admin },
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

    // Validate rubroId if provided
    if (dto.rubroId) {
      const rubro = await this.prisma.professionCategory.findFirst({
        where: { id: dto.rubroId, level: 1, isActive: true },
      });

      if (!rubro) {
        throw new BadRequestException('Rubro invalido. Debe ser un rubro de nivel 1');
      }
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
            countryId: dto.countryId,
            provinceId: dto.provinceId,
            whatsapp: dto.whatsapp,
            services: [],
            ...(dto.rubroId ? { rubroId: dto.rubroId } : {}),
            profileStatus: ProfileStatus.onboarding,
          },
        },
      },
      include: { profile: true },
    });

    // Fire-and-forget verification email
    this.sendVerificationEmail(user.id, user.email, dto.name);

    return this.generateToken(user);
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    let payload: VerificationPayload;
    try {
      payload = this.jwtService.verify<VerificationPayload>(token);
    } catch {
      throw new BadRequestException('Token de verificacion invalido o expirado');
    }

    if (payload.purpose !== 'email-verification') {
      throw new BadRequestException('Token invalido');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (user.emailVerified) {
      return { message: 'Email ya fue verificado anteriormente' };
    }

    await this.prisma.user.update({
      where: { id: payload.sub },
      data: { emailVerified: true },
    });

    return { message: 'Email verificado exitosamente' };
  }

  async resendVerification(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { message: 'Si el email existe, se envio un nuevo enlace de verificacion' };
    }

    if (user.emailVerified) {
      return { message: 'El email ya fue verificado' };
    }

    this.sendVerificationEmail(user.id, user.email);

    return { message: 'Si el email existe, se envio un nuevo enlace de verificacion' };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await this.prisma.user.update({
        where: { id: user.id },
        data: { resetToken: hashedToken, resetTokenExpiry: expiry },
      });

      const resetUrl = `${this.frontendUrl}/reset-password?userId=${user.id}&token=${rawToken}`;
      // Fire-and-forget
      this.mailService.sendPasswordReset(email, resetUrl, user.profile?.name);
    }

    // Generic message — don't reveal if email exists
    return { message: 'Si el email esta registrado, recibiras un enlace para restablecer tu contraseña' };
  }

  async resetPassword(userId: string, token: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.resetToken || !user.resetTokenExpiry) {
      throw new BadRequestException('Token de recuperacion invalido o expirado');
    }

    if (user.resetTokenExpiry < new Date()) {
      throw new BadRequestException('Token de recuperacion invalido o expirado');
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    if (hashedToken !== user.resetToken) {
      throw new BadRequestException('Token de recuperacion invalido o expirado');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
        emailVerified: true, // also verify email if not already
      },
    });

    return { message: 'Contraseña restablecida exitosamente' };
  }

  private sendVerificationEmail(userId: string, email: string, name?: string): void {
    const token = this.jwtService.sign(
      { sub: userId, purpose: 'email-verification' },
      { expiresIn: '24h' },
    );
    const verificationUrl = `${this.frontendUrl}/verify-email?token=${token}`;
    this.mailService.sendEmailVerification(email, verificationUrl, name);
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
