import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { Role } from '../users/entities/user-role.entity';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ListBookingsQueryDto } from './dto/list-bookings-query.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';

@ApiTags('Bookings')
@Controller('bookings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({
    summary: 'Criar novo agendamento',
    description:
      'Cria um agendamento com um ou mais serviços. Retorna sugestão caso já exista agendamento na mesma semana.',
  })
  @ApiResponse({ status: 201, description: 'Agendamento criado com sucesso' })
  @ApiResponse({
    status: 400,
    description: 'Data inválida, fora do horário ou regra dos 2 dias',
  })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateBookingDto) {
    const isAdmin = user.role === Role.ADMIN;
    return this.bookingsService.create(
      user.establishmentId,
      user.sub,
      dto,
      isAdmin,
    );
  }

  @Get('me')
  @ApiOperation({ summary: 'Listar meus agendamentos' })
  @ApiResponse({
    status: 200,
    description: 'Agendamentos do cliente autenticado',
  })
  listMyBookings(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListBookingsQueryDto,
  ) {
    return this.bookingsService.listByCustomer(
      user.sub,
      user.establishmentId,
      query,
    );
  }

  @Get('dashboard/weekly')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Estatísticas semanais (Admin)' })
  @ApiQuery({
    name: 'weekOf',
    required: false,
    description: 'Data de referência ISO 8601',
  })
  @ApiResponse({ status: 200, description: 'Stats da semana' })
  getWeeklyStats(
    @CurrentUser() user: JwtPayload,
    @Query('weekOf') weekOf?: string,
  ) {
    return this.bookingsService.getWeeklyStats(user.establishmentId, weekOf);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Listar todos os agendamentos do estabelecimento (Admin)',
  })
  @ApiResponse({ status: 200, description: 'Todos os agendamentos' })
  listAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListBookingsQueryDto,
  ) {
    return this.bookingsService.listAll(user.establishmentId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de um agendamento' })
  @ApiResponse({
    status: 200,
    description: 'Dados do agendamento com serviços',
  })
  @ApiResponse({ status: 404, description: 'Agendamento não encontrado' })
  findById(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.bookingsService.findById(id, user.establishmentId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Editar agendamento',
    description:
      'Altera data e/ou serviços. Regra dos 2 dias se aplica para clientes.',
  })
  @ApiResponse({ status: 200, description: 'Agendamento atualizado' })
  @ApiResponse({
    status: 400,
    description: 'Regra dos 2 dias ou status inválido',
  })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateBookingDto,
  ) {
    const isAdmin = user.role === Role.ADMIN;
    return this.bookingsService.update(
      id,
      user.establishmentId,
      user.sub,
      dto,
      isAdmin,
    );
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualizar status do agendamento (Admin)' })
  @ApiResponse({ status: 200, description: 'Status atualizado' })
  updateStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateBookingStatusDto,
  ) {
    return this.bookingsService.updateStatus(id, user.establishmentId, dto);
  }

  @Put(':id/cancel')
  @ApiOperation({
    summary: 'Cancelar agendamento',
    description:
      'Cancela um agendamento respeitando a regra de antecedência mínima.',
  })
  @ApiResponse({ status: 200, description: 'Agendamento cancelado' })
  @ApiResponse({
    status: 400,
    description: 'Menos de 2 dias de antecedência ou já cancelado',
  })
  cancel(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const isAdmin = user.role === Role.ADMIN;
    return this.bookingsService.cancel(
      id,
      user.establishmentId,
      isAdmin ? undefined : user.sub,
    );
  }
}
