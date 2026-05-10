import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from './entities/user-role.entity';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Obter perfil do usuário autenticado',
    description: 'Retorna os dados do usuário logado',
  })
  @ApiResponse({
    status: 200,
    description: 'Dados do perfil do usuário',
    type: User,
  })
  getProfile(@CurrentUser() user: JwtPayload): Promise<User | null> {
    return this.usersService.findById(user.sub);
  }

  @Get('customers')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Listar clientes do estabelecimento (Admin)',
    description:
      'Retorna lista de clientes com estatísticas: total de agendamentos, último agendamento, total gasto e ticket médio.',
  })
  listCustomers(@CurrentUser() user: JwtPayload) {
    return this.usersService.listCustomersWithStats(user.establishmentId);
  }

  @Put('me')
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
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProfileDto,
  ): Promise<User> {
    return this.usersService.updateProfile(user.sub, dto.name, dto.phone);
  }
}
