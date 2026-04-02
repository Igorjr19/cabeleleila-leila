import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

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
      dto.password,
      dto.establishmentId,
    );
  }

  @Post('login')
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
}
