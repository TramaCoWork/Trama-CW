import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService, TokenResponse } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ProfessionalRegisterDto } from './dto/professional-register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateReferralCodeDto } from './dto/update-referral-code.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { CurrentUserType } from './decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
@Throttle({ default: { ttl: 60000, limit: 10 } })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Registrar nuevo usuario (envia email de verificacion)',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'Usuario registrado. Se envio email de verificacion.',
  })
  @ApiResponse({ status: 409, description: 'Email ya registrado' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  register(@Body() dto: RegisterDto): Promise<TokenResponse> {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesion (requiere email verificado)' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 201, description: 'Login exitoso, retorna token JWT' })
  @ApiResponse({ status: 401, description: 'Credenciales invalidas' })
  @ApiResponse({ status: 403, description: 'Email no verificado' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  login(@Body() dto: LoginDto): Promise<TokenResponse> {
    return this.authService.login(dto);
  }

  @Post('admin/login')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Iniciar sesion como administrador' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 201,
    description: 'Login admin exitoso, retorna token JWT',
  })
  @ApiResponse({ status: 401, description: 'Credenciales invalidas' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  adminLogin(@Body() dto: LoginDto): Promise<TokenResponse> {
    return this.authService.adminLogin(dto);
  }

  @Post('professional-register')
  @ApiOperation({
    summary:
      'Registrar nuevo profesional con perfil basico (envia email de verificacion)',
  })
  @ApiBody({ type: ProfessionalRegisterDto })
  @ApiResponse({
    status: 201,
    description: 'Profesional registrado. Se envio email de verificacion.',
  })
  @ApiResponse({ status: 409, description: 'Email ya registrado' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  professionalRegister(
    @Body() dto: ProfessionalRegisterDto,
  ): Promise<TokenResponse> {
    return this.authService.professionalRegister(dto);
  }

  @Get('verify-email')
  @ApiOperation({
    summary: 'Verificar email mediante token enviado por correo',
  })
  @ApiQuery({
    name: 'token',
    required: true,
    description: 'Token JWT de verificacion (enviado en el email)',
  })
  @ApiResponse({ status: 200, description: 'Email verificado exitosamente' })
  @ApiResponse({ status: 400, description: 'Token invalido o expirado' })
  verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('resend-verification')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Reenviar email de verificacion' })
  @ApiBody({ type: ResendVerificationDto })
  @ApiResponse({
    status: 201,
    description: 'Si el email existe y no fue verificado, se reenvia el enlace',
  })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto.email);
  }

  @Post('forgot-password')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({
    summary: 'Solicitar recuperacion de contraseña (envia email con enlace)',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 201,
    description:
      'Si el email esta registrado, se envia un enlace de recuperacion',
  })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({
    summary: 'Restablecer contraseña usando token recibido por email',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 201,
    description: 'Contraseña restablecida exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Token invalido o expirado' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(
      dto.userId,
      dto.token,
      dto.newPassword,
    );
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cambiar contraseña del usuario autenticado' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Contraseña actualizada exitosamente',
  })
  @ApiResponse({ status: 401, description: 'Contraseña actual incorrecta' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  changePassword(
    @CurrentUser() user: CurrentUserType,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      user.userId,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @Get('me/referral-code')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener el código de referido del usuario autenticado',
  })
  @ApiResponse({ status: 200, description: 'Código de referido del usuario' })
  getMyReferralCode(@CurrentUser() user: CurrentUserType) {
    return this.authService.getMyReferralCode(user.userId);
  }

  @Patch('me/referral-code')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Actualizar el código de referido del usuario autenticado',
  })
  @ApiBody({ type: UpdateReferralCodeDto })
  @ApiResponse({ status: 200, description: 'Código actualizado exitosamente' })
  @ApiResponse({
    status: 409,
    description: 'Código ya en uso por otro usuario',
  })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  updateMyReferralCode(
    @CurrentUser() user: CurrentUserType,
    @Body() dto: UpdateReferralCodeDto,
  ) {
    return this.authService.updateMyReferralCode(user.userId, dto);
  }
}
