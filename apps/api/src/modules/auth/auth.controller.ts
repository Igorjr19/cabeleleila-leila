import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Registrar novo usuário',
    description:
      'Cria um novo usuário e o vincula a um estabelecimento como CUSTOMER',
  })
  @ApiResponse({
    status: 201,
    description: 'Usuário registrado com sucesso',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Email já existe ou dados inválidos',
  })
  register(@Body() dto: RegisterDto): Promise<any> {
    return this.authService.register(
      dto.name,
      dto.email,
      dto.phone,
      dto.password,
      dto.establishmentId,
    );
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login de usuário',
    description: 'Autentica o usuário e retorna JWT token',
  })
  @ApiResponse({
    status: 200,
    description: 'Login realizado com sucesso',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciais inválidas ou usuário sem acesso',
  })
  login(@Body() dto: LoginDto): Promise<any> {
    return this.authService.login(dto.email, dto.password, dto.establishmentId);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Solicitar redefinição de senha',
    description:
      'Gera um token de redefinição válido por 30 minutos. Em produção o token seria enviado por e-mail; nesta versão demo, é retornado para que o frontend exiba o link diretamente.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Token gerado (ou null se o e-mail não existir — resposta neutra)',
  })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Redefinir senha usando token',
    description:
      'Aceita o token recebido em /auth/forgot-password e atualiza a senha do usuário.',
  })
  @ApiResponse({ status: 200, description: 'Senha redefinida' })
  @ApiResponse({
    status: 400,
    description: 'Token inválido, expirado ou já usado',
  })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ ok: true }> {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { ok: true };
  }
}
