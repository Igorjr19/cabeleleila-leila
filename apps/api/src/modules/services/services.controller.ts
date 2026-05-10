import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { Role } from '../users/entities/user-role.entity';
import { CreateServiceDto } from './dto/create-service.dto';
import { ServiceResponseDto } from './dto/service-response.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServicesService } from './services.service';

@ApiTags('Services')
@Controller('services')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Criar serviço (Admin)' })
  @ApiResponse({
    status: 201,
    description: 'Serviço criado',
    type: ServiceResponseDto,
  })
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateServiceDto,
  ): Promise<ServiceResponseDto> {
    return this.servicesService.create(
      user.establishmentId,
      dto.name,
      dto.price,
      dto.durationMinutes,
    );
  }

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Listar serviços do estabelecimento',
    description:
      'Endpoint público — pode ser chamado sem autenticação (cadastro fluido). Admin autenticado vê serviços inativos também.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de serviços',
    type: [ServiceResponseDto],
  })
  findByEstablishment(
    @CurrentUser() user: JwtPayload | null,
    @Query('establishmentId') queryEstablishmentId?: string,
  ): Promise<ServiceResponseDto[]> {
    const establishmentId = user?.establishmentId ?? queryEstablishmentId;
    if (!establishmentId) {
      throw new BadRequestException(
        'establishmentId é obrigatório quando não há autenticação.',
      );
    }
    const isAdmin = user?.role === Role.ADMIN;
    return this.servicesService.findByEstablishment(establishmentId, isAdmin);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de um serviço' })
  @ApiResponse({
    status: 200,
    description: 'Dados do serviço',
    type: ServiceResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Serviço não encontrado' })
  findById(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<ServiceResponseDto | null> {
    return this.servicesService.findById(id, user.establishmentId);
  }

  @Patch(':id/active')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Ativar/desativar serviço (Admin)',
    description:
      'Serviços inativos não aparecem para clientes mas mantêm o histórico.',
  })
  @ApiResponse({
    status: 200,
    description: 'Serviço atualizado',
    type: ServiceResponseDto,
  })
  setActive(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: { active: boolean },
  ): Promise<ServiceResponseDto> {
    return this.servicesService.setActive(
      id,
      user.establishmentId,
      !!dto.active,
    );
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualizar serviço (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Serviço atualizado',
    type: ServiceResponseDto,
  })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
  ): Promise<ServiceResponseDto> {
    return this.servicesService.update(id, user.establishmentId, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir serviço (Admin)' })
  @ApiResponse({ status: 204, description: 'Serviço excluído' })
  @ApiResponse({
    status: 400,
    description: 'Serviço com agendamentos vinculados',
  })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.servicesService.remove(id, user.establishmentId);
  }
}
