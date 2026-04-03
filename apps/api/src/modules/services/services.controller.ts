import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
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
  @ApiResponse({ status: 201, description: 'Serviço criado' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateServiceDto) {
    return this.servicesService.create(
      user.establishmentId,
      dto.name,
      dto.price,
      dto.durationMinutes,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Listar serviços do estabelecimento' })
  @ApiResponse({ status: 200, description: 'Lista de serviços' })
  findByEstablishment(@CurrentUser() user: JwtPayload) {
    return this.servicesService.findByEstablishment(user.establishmentId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de um serviço' })
  @ApiResponse({ status: 200, description: 'Dados do serviço' })
  @ApiResponse({ status: 404, description: 'Serviço não encontrado' })
  findById(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.servicesService.findById(id, user.establishmentId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualizar serviço (Admin)' })
  @ApiResponse({ status: 200, description: 'Serviço atualizado' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
  ) {
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
