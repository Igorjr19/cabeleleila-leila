import { Body, Controller, Get, Put, Request, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

interface AuthenticatedRequest extends ExpressRequest {
  user: JwtPayload;
}

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obter perfil do usuário autenticado',
    description: 'Retorna os dados do usuário logado',
  })
  @ApiResponse({
    status: 200,
    description: 'Dados do perfil do usuário',
    type: User,
  })
  getProfile(@Request() req: AuthenticatedRequest): Promise<User | null> {
    return this.usersService.findById(req.user.sub);
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Atualizar perfil do usuário',
    description: 'Atualiza nome e telefone do usuário autenticado',
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil atualizado com sucesso',
    type: User,
  })
  updateProfile(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
  ): Promise<User> {
    return this.usersService.updateProfile(req.user.sub, dto.name, dto.phone);
  }
}
