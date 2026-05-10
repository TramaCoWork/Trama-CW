import { Controller, Post, Get, Body, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiQuery } from '@nestjs/swagger';
import { AuthService, TokenResponse } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ProfessionalRegisterDto } from './dto/professional-register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar nuevo usuario (envia email de verificacion)' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'Usuario registrado. Se envio email de verificacion.' })
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
  @ApiOperation({ summary: 'Iniciar sesion como administrador' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 201, description: 'Login admin exitoso, retorna token JWT' })
  @ApiResponse({ status: 401, description: 'Credenciales invalidas' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  adminLogin(@Body() dto: LoginDto): Promise<TokenResponse> {
    return this.authService.adminLogin(dto);
  }

  @Post('professional-register')
  @ApiOperation({ summary: 'Registrar nuevo profesional con perfil basico (envia email de verificacion)' })
  @ApiBody({ type: ProfessionalRegisterDto })
  @ApiResponse({ status: 201, description: 'Profesional registrado. Se envio email de verificacion.' })
  @ApiResponse({ status: 409, description: 'Email ya registrado' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  professionalRegister(@Body() dto: ProfessionalRegisterDto): Promise<TokenResponse> {
    return this.authService.professionalRegister(dto);
  }

  @Get('verify-email')
  @ApiOperation({ summary: 'Verificar email mediante token enviado por correo' })
  @ApiQuery({ name: 'token', required: true, description: 'Token JWT de verificacion (enviado en el email)' })
  @ApiResponse({ status: 200, description: 'Email verificado exitosamente' })
  @ApiResponse({ status: 400, description: 'Token invalido o expirado' })
  verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('resend-verification')
  @ApiOperation({ summary: 'Reenviar email de verificacion' })
  @ApiBody({ type: ResendVerificationDto })
  @ApiResponse({ status: 201, description: 'Si el email existe y no fue verificado, se reenvia el enlace' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto.email);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Solicitar recuperacion de contraseña (envia email con enlace)' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({ status: 201, description: 'Si el email esta registrado, se envia un enlace de recuperacion' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Restablecer contraseña usando token recibido por email' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 201, description: 'Contraseña restablecida exitosamente' })
  @ApiResponse({ status: 400, description: 'Token invalido o expirado' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.userId, dto.token, dto.newPassword);
  }
}
