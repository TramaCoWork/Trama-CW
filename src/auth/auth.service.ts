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
import { UpdateReferralCodeDto } from './dto/update-referral-code.dto';
import { ProfileStatus, RoleType } from '@prisma/client';
import { withoutDeleted } from '../common/filters/soft-delete.filter';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

export interface TokenResponse {
  access_token: string;
  userId: string;
}

interface JwtUserPayload {
  sub: string;
  email: string;
  roles: { name: string; type: RoleType }[];
  permissions: string[];
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
    this.frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:4321',
    );
  }

  async register(dto: RegisterDto): Promise<TokenResponse> {
    const existing = await this.prisma.user.findUnique({
      where: withoutDeleted({ email: dto.email }),
    });

    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        userRoles: {
          create: [{ role: { connect: { name: 'client' } } }],
        },
      },
    });

    // Fire-and-forget verification email
    this.sendVerificationEmail(user.id, user.email);

    return this.generateToken(user.id, user.email);
  }

  async login(dto: LoginDto): Promise<TokenResponse> {
    const user = await this.prisma.user.findUnique({
      where: withoutDeleted({ email: dto.email }),
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
      where: withoutDeleted({ userId: user.id }),
    });

    if (
      profile &&
      profile.profileStatus === 'active' &&
      profile.trialEndDate &&
      profile.trialEndDate < new Date()
    ) {
      await this.prisma.professionalProfile.update({
        where: withoutDeleted({ id: profile.id }),
        data: {
          profileStatus: 'waiting_payment',
          isActive: false,
          trialEndDate: null,
        },
      });
    }

    await this.prisma.user.update({
      where: withoutDeleted({ id: user.id }),
      data: { lastLoginAt: new Date() },
    });

    return this.generateToken(user.id, user.email);
  }

  async adminLogin(dto: LoginDto): Promise<TokenResponse> {
    const user = await this.prisma.user.findUnique({
      where: withoutDeleted({ email: dto.email }),
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const hasAdminRole = await this.prisma.userRole.findFirst({
      where: {
        userId: user.id,
        role: {
          OR: [{ type: RoleType.admin }, { name: 'admin' }],
        },
      },
      select: { id: true },
    });

    if (!hasAdminRole) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: withoutDeleted({ id: user.id }),
      data: { lastLoginAt: new Date() },
    });

    return this.generateToken(user.id, user.email);
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
        throw new BadRequestException(
          'Rubro invalido. Debe ser un rubro de nivel 1',
        );
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    // Resolver referralByUserId si viene un código de referido
    const referralByUserId = dto.referralCode
      ? await this.findUserByReferralCode(dto.referralCode)
      : null;

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        userRoles: {
          create: [{ role: { connect: { name: 'professional' } } }],
        },
        ...(referralByUserId && { referralByUserId }),
        profile: {
          create: {
            name: dto.name,
            city: dto.city,
            address: dto.address,
            countryId: dto.countryId,
            provinceId: dto.provinceId,
            whatsapp: dto.whatsapp,
            services: [],
            ...(dto.rubroId ? { rubroId: dto.rubroId } : {}),
            profileStatus: ProfileStatus.onboarding,
            hideProfile: false,
          },
        },
      },
      include: { profile: true },
    });

    // Fire-and-forget verification email
    this.sendVerificationEmail(user.id, user.email, dto.name);

    return this.generateToken(user.id, user.email);
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    let payload: VerificationPayload;
    try {
      payload = this.jwtService.verify<VerificationPayload>(token);
    } catch {
      throw new BadRequestException(
        'Token de verificacion invalido o expirado',
      );
    }

    if (payload.purpose !== 'email-verification') {
      throw new BadRequestException('Token invalido');
    }

    const user = await this.prisma.user.findUnique({
      where: withoutDeleted({ id: payload.sub }),
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (user.emailVerified) {
      return { message: 'Email ya fue verificado anteriormente' };
    }

    await this.prisma.user.update({
      where: withoutDeleted({ id: payload.sub }),
      data: {
        emailVerified: true,
        // Setear referralCode con el email si aún no tiene uno
        ...(!user.referralCode && { referralCode: user.email }),
      },
    });

    return { message: 'Email verificado exitosamente' };
  }

  async resendVerification(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: withoutDeleted({ email }),
    });

    if (!user) {
      return {
        message: 'Si el email existe, se envio un nuevo enlace de verificacion',
      };
    }

    if (user.emailVerified) {
      return { message: 'El email ya fue verificado' };
    }

    this.sendVerificationEmail(user.id, user.email);

    return {
      message: 'Si el email existe, se envio un nuevo enlace de verificacion',
    };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: withoutDeleted({ email }),
      include: { profile: true },
    });

    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto
        .createHash('sha256')
        .update(rawToken)
        .digest('hex');
      const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await this.prisma.user.update({
        where: withoutDeleted({ id: user.id }),
        data: { resetToken: hashedToken, resetTokenExpiry: expiry },
      });

      const resetUrl = `${this.frontendUrl}/reset-password?userId=${user.id}&token=${rawToken}`;
      // Fire-and-forget
      this.mailService.sendPasswordReset(email, resetUrl, user.profile?.name);
    }

    // Generic message — don't reveal if email exists
    return {
      message:
        'Si el email esta registrado, recibiras un enlace para restablecer tu contraseña',
    };
  }

  async resetPassword(
    userId: string,
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: withoutDeleted({ id: userId }),
    });

    if (!user || !user.resetToken || !user.resetTokenExpiry) {
      throw new BadRequestException(
        'Token de recuperacion invalido o expirado',
      );
    }

    if (user.resetTokenExpiry < new Date()) {
      throw new BadRequestException(
        'Token de recuperacion invalido o expirado',
      );
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    if (hashedToken !== user.resetToken) {
      throw new BadRequestException(
        'Token de recuperacion invalido o expirado',
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: withoutDeleted({ id: userId }),
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
        emailVerified: true, // also verify email if not already
      },
    });

    return { message: 'Contraseña restablecida exitosamente' };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: withoutDeleted({ id: userId }),
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const passwordValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );

    if (!passwordValid) {
      throw new UnauthorizedException('La contraseña actual es incorrecta');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: withoutDeleted({ id: userId }),
      data: { passwordHash },
    });

    return { message: 'Contraseña actualizada exitosamente' };
  }

  /**
   * Reenvía el email de verificación a un usuario por su id (uso admin).
   * A diferencia de `resendVerification`, no oculta la existencia del usuario:
   * lanza error si no existe o si ya está verificado.
   */
  async resendVerificationByUserId(userId: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: withoutDeleted({ id: userId }),
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (user.emailVerified) {
      throw new BadRequestException('El email ya fue verificado');
    }

    this.sendVerificationEmail(user.id, user.email);

    return { message: 'Email de verificación reenviado' };
  }

  private sendVerificationEmail(
    userId: string,
    email: string,
    name?: string,
  ): void {
    const token = this.jwtService.sign(
      { sub: userId, purpose: 'email-verification' },
      { expiresIn: '24h' },
    );
    const verificationUrl = `${this.frontendUrl}/verify-email?token=${token}`;
    this.mailService.sendEmailVerification(email, verificationUrl, name);
  }

  private async generateToken(userId: string, email: string): Promise<TokenResponse> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    const roles = userRoles.map((userRole) => ({
      name: userRole.role.name,
      type: userRole.role.type,
    }));

    const permissions = [
      ...new Set(
        userRoles.flatMap((userRole) =>
          userRole.role.permissions.map((rolePermission) => rolePermission.permission.key),
        ),
      ),
    ];

    const payload: JwtUserPayload = { sub: userId, email, roles, permissions };

    return {
      access_token: this.jwtService.sign(payload),
      userId,
    };
  }

  /**
   * Busca un usuario por su referralCode y retorna su id.
   * Retorna null si el código no existe o el usuario está eliminado.
   */
  async findUserByReferralCode(code: string): Promise<string | null> {
    if (!code || !code.trim()) return null;
    const user = await this.prisma.user.findFirst({
      where: withoutDeleted({ referralCode: code.trim() }),
      select: { id: true },
    });
    return user?.id ?? null;
  }

  // ─── Referral code ───────────────────────────────────────────────────────

  /** Devuelve el referralCode del usuario autenticado. */
  async getMyReferralCode(userId: string): Promise<{ referralCode: string | null }> {
    const user = await this.prisma.user.findUnique({
      where: withoutDeleted({ id: userId }),
      select: { referralCode: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return { referralCode: user.referralCode };
  }

  /** Actualiza el referralCode del usuario autenticado. Valida unicidad. */
  async updateMyReferralCode(userId: string, dto: UpdateReferralCodeDto): Promise<{ referralCode: string }> {
    const code = dto.referralCode.trim();

    const existing = await this.prisma.user.findFirst({
      where: { referralCode: code },
    });
    if (existing && existing.id !== userId) {
      throw new ConflictException('Ese código de referido ya está en uso');
    }

    const updated = await this.prisma.user.update({
      where: withoutDeleted({ id: userId }),
      data: { referralCode: code },
      select: { referralCode: true },
    });

    return { referralCode: updated.referralCode! };
  }
}
