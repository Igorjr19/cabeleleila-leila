import {
  Body,
  Controller,
  Get,
  NotFoundException,
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
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { Role } from '../users/entities/user-role.entity';
import { BookingsService } from './bookings.service';
import { BookingResponseDto } from './dto/booking-response.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ListBookingsQueryDto } from './dto/list-bookings-query.dto';
import { UpdateBookingServiceStatusDto } from './dto/update-booking-service-status.dto';
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
  @ApiResponse({
    status: 201,
    description: 'Agendamento criado com sucesso',
    type: BookingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Data inválida, fora do horário ou regra dos 2 dias',
  })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    const isAdmin = user.role === Role.ADMIN;
    const result = await this.bookingsService.create(
      user.establishmentId,
      user.sub,
      dto,
      isAdmin,
    );
    return {
      ...result,
      scheduledAt: result.scheduledAt.toISOString(),
      createdAt: result.createdAt.toISOString(),
      services: result.services || [],
    };
  }

  @Get('me')
  @ApiOperation({ summary: 'Listar meus agendamentos' })
  @ApiResponse({
    status: 200,
    description: 'Agendamentos do cliente autenticado',
    type: [BookingResponseDto],
  })
  async listMyBookings(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListBookingsQueryDto,
  ): Promise<BookingResponseDto[]> {
    const results = await this.bookingsService.listByCustomer(
      user.sub,
      user.establishmentId,
      query,
    );
    return results.map((result) => ({
      ...result,
      scheduledAt: result.scheduledAt.toISOString(),
      createdAt: result.createdAt.toISOString(),
      services: result.services || [],
    }));
  }

  @Get('availability')
  @Public()
  @ApiOperation({
    summary: 'Listar slots de horário disponíveis para uma data',
    description:
      'Endpoint público (cadastro fluido). Retorna grade de horários a cada 15 minutos com flag de disponibilidade.',
  })
  @ApiQuery({ name: 'date', required: true, description: 'YYYY-MM-DD' })
  @ApiQuery({
    name: 'durationMinutes',
    required: true,
    description: 'Duração total dos serviços a agendar (minutos)',
  })
  @ApiQuery({
    name: 'establishmentId',
    required: false,
    description: 'Obrigatório quando o usuário não está autenticado',
  })
  @ApiResponse({ status: 200, description: 'Lista de slots' })
  async getAvailability(
    @CurrentUser() user: JwtPayload | null,
    @Query('date') date: string,
    @Query('durationMinutes') durationMinutesRaw: string,
    @Query('establishmentId') queryEstablishmentId?: string,
    @Query('excludeBookingId') excludeBookingId?: string,
  ) {
    const establishmentId = user?.establishmentId ?? queryEstablishmentId;
    if (!establishmentId) {
      throw new NotFoundException(
        'establishmentId é obrigatório quando não há autenticação.',
      );
    }
    const durationMinutes = Number(durationMinutesRaw);
    const isAdmin = user?.role === Role.ADMIN;
    return this.bookingsService.getAvailability(
      establishmentId,
      date,
      durationMinutes,
      isAdmin,
      excludeBookingId,
    );
  }

  @Get('same-week')
  @ApiOperation({
    summary: 'Verificar agendamento existente na mesma semana',
    description:
      'Retorna o agendamento ativo (PENDING/CONFIRMED) do cliente autenticado na mesma semana ISO da data informada, ou null caso não exista.',
  })
  @ApiQuery({
    name: 'date',
    required: true,
    description: 'Data alvo em ISO 8601 (UTC)',
  })
  @ApiResponse({
    status: 200,
    description: 'Booking existente na mesma semana, ou null',
    type: BookingResponseDto,
  })
  async checkSameWeek(
    @CurrentUser() user: JwtPayload,
    @Query('date') date: string,
  ): Promise<BookingResponseDto | null> {
    const target = new Date(date);
    const result = await this.bookingsService.findSameWeekBookingForCustomer(
      user.sub,
      user.establishmentId,
      target,
    );
    if (!result) return null;
    return {
      ...result,
      scheduledAt: result.scheduledAt.toISOString(),
      createdAt: result.createdAt.toISOString(),
      services: result.services || [],
    };
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
  @ApiResponse({
    status: 200,
    description: 'Todos os agendamentos',
    type: [BookingResponseDto],
  })
  async listAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListBookingsQueryDto,
  ): Promise<BookingResponseDto[]> {
    const results = await this.bookingsService.listAll(
      user.establishmentId,
      query,
    );
    return results.map((result) => ({
      ...result,
      scheduledAt: result.scheduledAt.toISOString(),
      createdAt: result.createdAt.toISOString(),
      services: result.services || [],
    }));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de um agendamento' })
  @ApiResponse({
    status: 200,
    description: 'Dados do agendamento com serviços',
    type: BookingResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Agendamento não encontrado' })
  async findById(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<BookingResponseDto | null> {
    const result = await this.bookingsService.findById(
      id,
      user.establishmentId,
    );
    if (!result) throw new NotFoundException('Agendamento não encontrado');
    return {
      ...result,
      scheduledAt: result.scheduledAt.toISOString(),
      createdAt: result.createdAt.toISOString(),
      services: result.services || [],
    };
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Editar agendamento',
    description:
      'Altera data e/ou serviços. Regra dos 2 dias se aplica para clientes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Agendamento atualizado',
    type: BookingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Regra dos 2 dias ou status inválido',
  })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateBookingDto,
  ): Promise<BookingResponseDto> {
    const isAdmin = user.role === Role.ADMIN;
    const result = await this.bookingsService.update(
      id,
      user.establishmentId,
      user.sub,
      dto,
      isAdmin,
    );
    return {
      ...result,
      scheduledAt: result.scheduledAt.toISOString(),
      createdAt: result.createdAt.toISOString(),
      services: result.services || [],
    };
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualizar status do agendamento (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Status atualizado',
    type: BookingResponseDto,
  })
  async updateStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateBookingStatusDto,
  ): Promise<BookingResponseDto> {
    const result = await this.bookingsService.updateStatus(
      id,
      user.establishmentId,
      dto,
    );
    return {
      ...result,
      scheduledAt: result.scheduledAt.toISOString(),
      createdAt: result.createdAt.toISOString(),
      services: result.services || [],
    };
  }

  @Patch(':bookingId/services/:serviceId/status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Atualizar status de um serviço dentro do agendamento (Admin)',
    description:
      'Permite ao salão marcar cada serviço solicitado como pendente, em andamento, concluído ou não realizado.',
  })
  @ApiResponse({
    status: 200,
    description: 'Status do serviço atualizado',
    type: BookingResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Agendamento ou serviço não encontrado',
  })
  async updateBookingServiceStatus(
    @CurrentUser() user: JwtPayload,
    @Param('bookingId') bookingId: string,
    @Param('serviceId') serviceId: string,
    @Body() dto: UpdateBookingServiceStatusDto,
  ): Promise<BookingResponseDto> {
    const result = await this.bookingsService.updateBookingServiceStatus(
      bookingId,
      serviceId,
      user.establishmentId,
      dto.status,
    );
    return {
      ...result,
      scheduledAt: result.scheduledAt.toISOString(),
      createdAt: result.createdAt.toISOString(),
      services: result.services || [],
    };
  }

  @Put(':id/cancel')
  @ApiOperation({
    summary: 'Cancelar agendamento',
    description:
      'Cancela um agendamento respeitando a regra de antecedência mínima.',
  })
  @ApiResponse({
    status: 200,
    description: 'Agendamento cancelado',
    type: BookingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Menos de 2 dias de antecedência ou já cancelado',
  })
  async cancel(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<BookingResponseDto> {
    const isAdmin = user.role === Role.ADMIN;
    const result = await this.bookingsService.cancel(
      id,
      user.establishmentId,
      isAdmin ? undefined : user.sub,
    );
    return {
      ...result,
      scheduledAt: result.scheduledAt.toISOString(),
      createdAt: result.createdAt.toISOString(),
      services: result.services || [],
    };
  }
}
