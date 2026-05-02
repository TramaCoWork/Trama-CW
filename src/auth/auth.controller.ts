import { Controller, Post, Body, UsePipes, ValidationPipe } from '@nestjs/common';
import { AuthService, TokenResponse } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ProfessionalRegisterDto } from './dto/professional-register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  register(@Body() dto: RegisterDto): Promise<TokenResponse> {
    return this.authService.register(dto);
  }

  @Post('login')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  login(@Body() dto: LoginDto): Promise<TokenResponse> {
    return this.authService.login(dto);
  }

  @Post('professional-register')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  professionalRegister(@Body() dto: ProfessionalRegisterDto): Promise<TokenResponse> {
    return this.authService.professionalRegister(dto);
  }
}
