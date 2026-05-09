import {
  AvailabilityResponse,
  AvailabilitySlot,
  BookingServiceStatus,
  BookingSuggestion,
  BusinessHours,
  SlotUnavailableReason,
  WeeklyStats,
} from '@cabeleleila/contracts';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EstablishmentService } from '../establishment/establishment.service';
import { Service } from '../services/entities/service.entity';
import { ServicesService } from '../services/services.service';
import { TimeBlocksService } from '../time-blocks/time-blocks.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ListBookingsQueryDto } from './dto/list-bookings-query.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { BookingService as BookingEntityService } from './entities/booking-service.entity';
import { Booking, BookingStatus } from './entities/booking.entity';
import { BookingWithServices } from './interfaces/booking-with-services.interface';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(BookingEntityService)
    private readonly bookingServiceRepo: Repository<BookingEntityService>,
    private readonly servicesService: ServicesService,
    private readonly establishmentService: EstablishmentService,
    private readonly timeBlocksService: TimeBlocksService,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    establishmentId: string,
    customerId: string,
    dto: CreateBookingDto,
    isAdmin: boolean,
  ): Promise<BookingWithServices> {
    const config = await this.establishmentService.getConfig(establishmentId);
    const scheduledDate = new Date(dto.scheduledAt);

    if (scheduledDate <= new Date()) {
      throw new BadRequestException('Data de agendamento deve estar no futuro');
    }

    if (!isAdmin) {
      this.validateMinDaysAhead(scheduledDate, config.minDaysForOnlineUpdate);
    }

    const services = await this.servicesService.findByIdsAndEstablishment(
      dto.serviceIds,
      establishmentId,
    );

    const totalDurationMinutes = services.reduce(
      (sum, s) => sum + s.durationMinutes,
      0,
    );

    this.validateBusinessHours(
      scheduledDate,
      totalDurationMinutes,
      config.businessHours,
    );

    await this.checkTimeSlotConflict(
      establishmentId,
      scheduledDate,
      totalDurationMinutes,
    );

    const suggestion = await this.checkSameWeekSuggestion(
      establishmentId,
      customerId,
      scheduledDate,
    );

    const saved = await this.dataSource.transaction(async (manager) => {
      const booking = manager.create(Booking, {
        establishmentId,
        customerId,
        scheduledAt: scheduledDate,
        status: BookingStatus.PENDING,
      });
      const savedBooking = await manager.save(booking);

      for (const service of services) {
        await manager.save(
          manager.create(BookingEntityService, {
            bookingId: savedBooking.id,
            serviceId: service.id,
            priceAtBooking: service.price,
          }),
        );
      }

      return savedBooking;
    });

    const withCustomer = await this.bookingRepo.findOne({
      where: { id: saved.id },
      relations: ['customer'],
    });

    return {
      ...saved,
      customerName: withCustomer?.customer?.name ?? '',
      services: services.map((s) => ({
        id: s.id,
        name: s.name,
        price: s.price,
        durationMinutes: s.durationMinutes,
        status: BookingServiceStatus.PENDING,
      })),
      suggestion,
    };
  }

  async update(
    bookingId: string,
    establishmentId: string,
    customerId: string,
    dto: UpdateBookingDto,
    isAdmin: boolean,
  ): Promise<BookingWithServices> {
    const booking = await this.bookingRepo.findOne({
      where: {
        id: bookingId,
        establishmentId,
        ...(isAdmin ? {} : { customerId }),
      },
      relations: ['bookingServices', 'bookingServices.service'],
    });

    if (!booking) {
      throw new NotFoundException('Agendamento não encontrado');
    }

    if (
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.FINISHED
    ) {
      throw new BadRequestException(
        'Não é possível alterar agendamentos finalizados ou cancelados',
      );
    }

    const config = await this.establishmentService.getConfig(establishmentId);

    if (!isAdmin) {
      this.validateMinDaysAhead(
        booking.scheduledAt,
        config.minDaysForOnlineUpdate,
      );
    }

    // Pre-fetch new services if updating serviceIds
    let updatedServices: Service[] | null = null;
    if (dto.serviceIds && dto.serviceIds.length > 0) {
      updatedServices = await this.servicesService.findByIdsAndEstablishment(
        dto.serviceIds,
        establishmentId,
      );
    }

    if (dto.scheduledAt) {
      const newDate = new Date(dto.scheduledAt);
      if (newDate <= new Date()) {
        throw new BadRequestException('Nova data deve estar no futuro');
      }
      if (!isAdmin) {
        this.validateMinDaysAhead(newDate, config.minDaysForOnlineUpdate);
      }

      const durationServices =
        updatedServices ?? booking.bookingServices.map((bs) => bs.service);
      const totalDurationMinutes = durationServices.reduce(
        (sum, s) => sum + s.durationMinutes,
        0,
      );

      this.validateBusinessHours(
        newDate,
        totalDurationMinutes,
        config.businessHours,
      );

      await this.checkTimeSlotConflict(
        establishmentId,
        newDate,
        totalDurationMinutes,
        bookingId,
      );

      booking.scheduledAt = newDate;
    }

    await this.bookingRepo.save(booking);

    if (updatedServices !== null) {
      const existing = await this.bookingServiceRepo.find({
        where: { bookingId },
      });
      const existingIds = new Set(existing.map((bs) => bs.serviceId));
      const newIds = new Set(updatedServices.map((s) => s.id));

      const toRemove = existing.filter((bs) => !newIds.has(bs.serviceId));
      if (toRemove.length > 0) {
        await this.bookingServiceRepo.remove(toRemove);
      }

      for (const service of updatedServices) {
        if (existingIds.has(service.id)) {
          continue;
        }
        await this.bookingServiceRepo.save(
          this.bookingServiceRepo.create({
            bookingId,
            serviceId: service.id,
            priceAtBooking: service.price,
          }),
        );
      }
    }

    return this.findById(
      bookingId,
      establishmentId,
    ) as Promise<BookingWithServices>;
  }

  private static readonly STATUS_TRANSITIONS: Record<
    BookingStatus,
    BookingStatus[]
  > = {
    [BookingStatus.PENDING]: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
    [BookingStatus.CONFIRMED]: [
      BookingStatus.FINISHED,
      BookingStatus.CANCELLED,
    ],
    [BookingStatus.CANCELLED]: [],
    [BookingStatus.FINISHED]: [],
  };

  async updateStatus(
    bookingId: string,
    establishmentId: string,
    dto: UpdateBookingStatusDto,
  ): Promise<BookingWithServices> {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId, establishmentId },
    });
    if (!booking) {
      throw new NotFoundException('Agendamento não encontrado');
    }

    const allowed = BookingsService.STATUS_TRANSITIONS[booking.status];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Transição de status inválida: ${booking.status} → ${dto.status}`,
      );
    }

    if (
      dto.status === BookingStatus.FINISHED &&
      booking.scheduledAt > new Date()
    ) {
      throw new BadRequestException(
        'Não é possível finalizar um agendamento antes do horário marcado.',
      );
    }

    if (dto.status === BookingStatus.CONFIRMED) {
      const stillPending = await this.bookingServiceRepo.count({
        where: { bookingId, status: BookingServiceStatus.PENDING },
      });
      if (stillPending > 0) {
        throw new BadRequestException(
          'Confirme ou recuse cada serviço solicitado antes de confirmar o agendamento.',
        );
      }
      const anyConfirmed = await this.bookingServiceRepo.count({
        where: { bookingId, status: BookingServiceStatus.CONFIRMED },
      });
      if (anyConfirmed === 0) {
        throw new BadRequestException(
          'Não há serviços confirmados para este agendamento. Cancele em vez de confirmar.',
        );
      }
    }

    booking.status = dto.status;
    await this.bookingRepo.save(booking);

    const result = await this.findById(bookingId, establishmentId);
    if (!result) {
      throw new NotFoundException('Agendamento não encontrado');
    }
    return result;
  }

  async listByCustomer(
    customerId: string,
    establishmentId: string,
    query?: ListBookingsQueryDto,
  ): Promise<BookingWithServices[]> {
    const qb = this.bookingRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.bookingServices', 'bs')
      .leftJoinAndSelect('bs.service', 's')
      .leftJoinAndSelect('b.customer', 'c')
      .where('b.establishment_id = :establishmentId', { establishmentId })
      .andWhere('b.customer_id = :customerId', { customerId })
      .orderBy('b.scheduled_at', 'DESC');

    if (query?.status) {
      qb.andWhere('b.status = :status', { status: query.status });
    }
    if (query?.startDate) {
      qb.andWhere('b.scheduled_at >= :startDate', {
        startDate: query.startDate,
      });
    }
    if (query?.endDate) {
      qb.andWhere('b.scheduled_at <= :endDate', { endDate: query.endDate });
    }

    const bookings = await qb.getMany();
    return this.mapBookingsWithServices(bookings);
  }

  async listAll(
    establishmentId: string,
    query?: ListBookingsQueryDto,
  ): Promise<BookingWithServices[]> {
    const qb = this.bookingRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.bookingServices', 'bs')
      .leftJoinAndSelect('bs.service', 's')
      .leftJoinAndSelect('b.customer', 'c')
      .where('b.establishment_id = :establishmentId', { establishmentId })
      .orderBy('b.scheduled_at', 'DESC');

    if (query?.status) {
      qb.andWhere('b.status = :status', { status: query.status });
    }
    if (query?.startDate) {
      qb.andWhere('b.scheduled_at >= :startDate', {
        startDate: query.startDate,
      });
    }
    if (query?.endDate) {
      qb.andWhere('b.scheduled_at <= :endDate', { endDate: query.endDate });
    }

    const bookings = await qb.getMany();
    return this.mapBookingsWithServices(bookings);
  }

  async findById(
    id: string,
    establishmentId?: string,
  ): Promise<BookingWithServices | null> {
    const where: Record<string, string> = { id };
    if (establishmentId) {
      where['establishmentId'] = establishmentId;
    }

    const booking = await this.bookingRepo.findOne({
      where,
      relations: ['bookingServices', 'bookingServices.service', 'customer'],
    });

    if (!booking) {
      return null;
    }

    return {
      ...booking,
      customerName: booking.customer?.name ?? '',
      services:
        booking.bookingServices?.map((bs) => ({
          id: bs.service.id,
          name: bs.service.name,
          price: bs.service.price,
          durationMinutes: bs.service.durationMinutes,
          status: bs.status,
        })) ?? [],
    };
  }

  async cancel(
    bookingId: string,
    establishmentId: string,
    customerId?: string,
  ): Promise<BookingWithServices> {
    const where: Record<string, string> = { id: bookingId, establishmentId };
    if (customerId) {
      where['customerId'] = customerId;
    }

    const booking = await this.bookingRepo.findOne({
      where,
      relations: ['bookingServices', 'bookingServices.service', 'customer'],
    });

    if (!booking) {
      throw new NotFoundException('Agendamento não encontrado');
    }

    if (
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.FINISHED
    ) {
      throw new BadRequestException(
        'Agendamento já está cancelado ou finalizado',
      );
    }

    const config = await this.establishmentService.getConfig(establishmentId);
    this.validateMinDaysAhead(
      booking.scheduledAt,
      config.minDaysForOnlineUpdate,
    );

    booking.status = BookingStatus.CANCELLED;
    await this.bookingRepo.save(booking);

    return {
      ...booking,
      customerName: booking.customer?.name ?? '',
      services:
        booking.bookingServices?.map((bs) => ({
          id: bs.service.id,
          name: bs.service.name,
          price: bs.service.price,
          durationMinutes: bs.service.durationMinutes,
          status: bs.status,
        })) ?? [],
    };
  }

  async getAvailability(
    establishmentId: string,
    dateString: string,
    durationMinutes: number,
    isAdmin: boolean,
  ): Promise<AvailabilityResponse> {
    if (
      !Number.isFinite(durationMinutes) ||
      durationMinutes <= 0 ||
      durationMinutes > 8 * 60
    ) {
      throw new BadRequestException(
        'Duração total inválida (entre 1 e 480 minutos).',
      );
    }
    const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
    if (!dateMatch) {
      throw new BadRequestException('Data inválida (use YYYY-MM-DD).');
    }

    const config = await this.establishmentService.getConfig(establishmentId);
    const year = Number(dateMatch[1]);
    const month = Number(dateMatch[2]) - 1;
    const day = Number(dateMatch[3]);
    const dayStart = new Date(year, month, day, 0, 0, 0, 0);
    const nextDayStart = new Date(year, month, day + 1, 0, 0, 0, 0);
    const dayOfWeek = dayStart.getDay();

    const hours = config.businessHours.find((h) => h.dayOfWeek === dayOfWeek);

    if (!hours || !hours.isOpen) {
      return {
        date: dateString,
        isOpen: false,
        openTime: hours?.openTime ?? null,
        closeTime: hours?.closeTime ?? null,
        lunchStart: hours?.lunchStart ?? null,
        lunchEnd: hours?.lunchEnd ?? null,
        durationMinutes,
        slots: [],
      };
    }

    const existing = await this.bookingRepo
      .createQueryBuilder('b')
      .leftJoin('b.bookingServices', 'bs')
      .leftJoin('bs.service', 's')
      .select('b.id', 'id')
      .addSelect('b.scheduled_at', 'scheduledAt')
      .addSelect(
        `COALESCE(SUM(CASE WHEN bs.status != 'DECLINED' THEN s.duration_minutes ELSE 0 END), 0)`,
        'duration',
      )
      .where('b.establishment_id = :est', { est: establishmentId })
      .andWhere('b.scheduled_at >= :start AND b.scheduled_at < :end', {
        start: dayStart.toISOString(),
        end: nextDayStart.toISOString(),
      })
      .andWhere('b.status IN (:...statuses)', {
        statuses: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
      })
      .groupBy('b.id, b.scheduled_at')
      .getRawMany<{ id: string; scheduledAt: string; duration: string }>();

    const existingIntervals = existing.map((e) => {
      const start = new Date(e.scheduledAt);
      const end = new Date(start.getTime() + Number(e.duration) * 60_000);
      return { start, end };
    });

    const blocks = await this.timeBlocksService.findInRange(
      establishmentId,
      dayStart,
      nextDayStart,
    );
    const blockIntervals = blocks.map((b) => ({
      start: b.startsAt,
      end: b.endsAt,
    }));

    const toMin = (hhmm: string): number => {
      const [h, m] = hhmm.split(':').map(Number);
      return h * 60 + m;
    };
    const fmtMin = (mins: number): string => {
      const h = Math.floor(mins / 60)
        .toString()
        .padStart(2, '0');
      const m = (mins % 60).toString().padStart(2, '0');
      return `${h}:${m}`;
    };

    const SLOT_STEP = 30;
    const openMin = toMin(hours.openTime);
    const closeMin = toMin(hours.closeTime);
    const lunchStartMin = hours.lunchStart ? toMin(hours.lunchStart) : null;
    const lunchEndMin = hours.lunchEnd ? toMin(hours.lunchEnd) : null;
    const now = new Date();
    const minDaysCutoff = new Date(
      now.getTime() + config.minDaysForOnlineUpdate * 86_400_000,
    );

    const slots: AvailabilitySlot[] = [];
    for (
      let startMin = openMin;
      startMin + durationMinutes <= closeMin;
      startMin += SLOT_STEP
    ) {
      const endMin = startMin + durationMinutes;
      const slotStart = new Date(
        year,
        month,
        day,
        Math.floor(startMin / 60),
        startMin % 60,
        0,
        0,
      );
      const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60_000);

      let reason: SlotUnavailableReason | undefined;

      if (slotStart.getTime() <= now.getTime()) {
        reason = 'PAST';
      } else if (!isAdmin && slotStart.getTime() < minDaysCutoff.getTime()) {
        reason = 'TOO_SOON';
      } else if (
        lunchStartMin !== null &&
        lunchEndMin !== null &&
        startMin < lunchEndMin &&
        endMin > lunchStartMin
      ) {
        reason = 'LUNCH';
      } else if (
        existingIntervals.some((i) => slotStart < i.end && slotEnd > i.start)
      ) {
        reason = 'OCCUPIED';
      } else if (
        blockIntervals.some((i) => slotStart < i.end && slotEnd > i.start)
      ) {
        reason = 'BLOCKED';
      }

      slots.push({
        time: fmtMin(startMin),
        startsAt: slotStart.toISOString(),
        available: !reason,
        reason,
      });
    }

    return {
      date: dateString,
      isOpen: true,
      openTime: hours.openTime,
      closeTime: hours.closeTime,
      lunchStart: hours.lunchStart,
      lunchEnd: hours.lunchEnd,
      durationMinutes,
      slots,
    };
  }

  async getWeeklyStats(
    establishmentId: string,
    weekOf?: string,
  ): Promise<WeeklyStats> {
    const referenceDate = weekOf ? new Date(weekOf) : new Date();

    const result = await this.bookingRepo
      .createQueryBuilder('b')
      .leftJoin('b.bookingServices', 'bs')
      .select([
        `DATE_TRUNC('week', b.scheduled_at) AS "weekStart"`,
        `COUNT(DISTINCT b.id) AS "totalBookings"`,
        `COUNT(DISTINCT CASE WHEN b.status = 'CONFIRMED' THEN b.id END) AS "confirmedBookings"`,
        `COUNT(DISTINCT CASE WHEN b.status = 'CANCELLED' THEN b.id END) AS "cancelledBookings"`,
        `COUNT(DISTINCT CASE WHEN b.status = 'FINISHED' THEN b.id END) AS "finishedBookings"`,
        `COALESCE(SUM(CASE WHEN b.status != 'CANCELLED' THEN bs.price_at_booking END), 0) AS "totalRevenue"`,
      ])
      .where('b.establishment_id = :establishmentId', { establishmentId })
      .andWhere(
        `DATE_TRUNC('week', b.scheduled_at) = DATE_TRUNC('week', :referenceDate::timestamptz)`,
        { referenceDate: referenceDate.toISOString() },
      )
      .groupBy(`DATE_TRUNC('week', b.scheduled_at)`)
      .getRawOne<{
        weekStart: string | Date;
        totalBookings: string;
        confirmedBookings: string;
        cancelledBookings: string;
        finishedBookings: string;
        totalRevenue: string;
      }>();

    const weekStart = result?.weekStart
      ? new Date(result.weekStart)
      : this.getISOWeekStart(referenceDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    return {
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      totalBookings: parseInt(result?.totalBookings ?? '0', 10),
      confirmedBookings: parseInt(result?.confirmedBookings ?? '0', 10),
      cancelledBookings: parseInt(result?.cancelledBookings ?? '0', 10),
      finishedBookings: parseInt(result?.finishedBookings ?? '0', 10),
      totalRevenue: parseFloat(result?.totalRevenue ?? '0'),
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private validateBusinessHours(
    scheduledDate: Date,
    durationMinutes: number,
    hoursArray: BusinessHours[],
  ): void {
    const dayOfWeek = scheduledDate.getDay();
    const hours = hoursArray.find((h) => h.dayOfWeek === dayOfWeek);

    if (!hours || !hours.isOpen) {
      throw new BadRequestException('Salão fechado neste dia da semana');
    }

    const toMin = (hhmm: string): number => {
      const [h, m] = hhmm.split(':').map(Number);
      return h * 60 + m;
    };
    const fmtMin = (mins: number): string => {
      const h = Math.floor(mins / 60)
        .toString()
        .padStart(2, '0');
      const m = (mins % 60).toString().padStart(2, '0');
      return `${h}:${m}`;
    };

    const startMin = scheduledDate.getHours() * 60 + scheduledDate.getMinutes();
    const endMin = startMin + durationMinutes;
    const openMin = toMin(hours.openTime);
    const closeMin = toMin(hours.closeTime);

    if (startMin < openMin || startMin >= closeMin) {
      throw new BadRequestException(
        `Horário fora do funcionamento do salão (${hours.openTime}–${hours.closeTime}).`,
      );
    }
    if (endMin > closeMin) {
      throw new BadRequestException(
        `Horário fora do funcionamento: o serviço terminaria às ${fmtMin(endMin)} e o salão fecha às ${hours.closeTime}.`,
      );
    }
    if (hours.lunchStart && hours.lunchEnd) {
      const lunchStartMin = toMin(hours.lunchStart);
      const lunchEndMin = toMin(hours.lunchEnd);
      // Overlap if [start,end) intersects [lunchStart,lunchEnd)
      if (startMin < lunchEndMin && endMin > lunchStartMin) {
        throw new BadRequestException(
          `O serviço conflita com o horário de almoço (${hours.lunchStart}–${hours.lunchEnd}).`,
        );
      }
    }
  }

  private validateMinDaysAhead(scheduledDate: Date, minDays: number): void {
    const diffDays = (scheduledDate.getTime() - Date.now()) / 86_400_000;
    if (diffDays < minDays) {
      throw new BadRequestException(
        `Alterações online exigem ${minDays} dias de antecedência. ` +
          `Para datas mais próximas, entre em contato por telefone.`,
      );
    }
  }

  private async checkTimeSlotConflict(
    establishmentId: string,
    scheduledDate: Date,
    totalDurationMinutes: number,
    excludeBookingId?: string,
  ): Promise<void> {
    const newEnd = new Date(
      scheduledDate.getTime() + totalDurationMinutes * 60_000,
    );

    const params: unknown[] = [
      establishmentId,
      newEnd.toISOString(),
      scheduledDate.toISOString(),
    ];

    let excludeClause = '';
    if (excludeBookingId) {
      params.push(excludeBookingId);
      excludeClause = `AND b.id != $${params.length}`;
    }

    const result: { id: string }[] = await this.dataSource.query(
      `SELECT b.id
       FROM bookings b
       INNER JOIN booking_services bs ON bs.booking_id = b.id
       INNER JOIN services s ON s.id = bs.service_id
       WHERE b.establishment_id = $1
         AND b.status IN ('PENDING', 'CONFIRMED')
         AND bs.status != 'DECLINED'
         AND b.scheduled_at < $2
         ${excludeClause}
       GROUP BY b.id, b.scheduled_at
       HAVING (b.scheduled_at + (SUM(s.duration_minutes) * INTERVAL '1 minute')) > $3
       LIMIT 1`,
      params,
    );

    if (result.length > 0) {
      throw new BadRequestException(
        'Horário indisponível. Já existe um agendamento neste horário. Por favor, escolha outro horário.',
      );
    }

    const blocks = await this.timeBlocksService.findInRange(
      establishmentId,
      scheduledDate,
      newEnd,
    );
    if (blocks.length > 0) {
      throw new BadRequestException(
        'Horário indisponível: o salão tem um bloqueio cadastrado neste período.',
      );
    }
  }

  private async checkSameWeekSuggestion(
    establishmentId: string,
    customerId: string,
    scheduledDate: Date,
  ): Promise<BookingSuggestion> {
    const existing = await this.findSameWeekBooking(
      establishmentId,
      customerId,
      scheduledDate,
    );

    if (existing) {
      return {
        hasSameWeekBooking: true,
        suggestedDate: existing.scheduledAt.toISOString(),
        existingBookingId: existing.id,
      };
    }

    return {
      hasSameWeekBooking: false,
      suggestedDate: null,
      existingBookingId: null,
    };
  }

  async findSameWeekBookingForCustomer(
    customerId: string,
    establishmentId: string,
    targetDate: Date,
  ): Promise<BookingWithServices | null> {
    const existing = await this.findSameWeekBooking(
      establishmentId,
      customerId,
      targetDate,
    );
    if (!existing) return null;
    return this.findById(existing.id, establishmentId);
  }

  private findSameWeekBooking(
    establishmentId: string,
    customerId: string,
    scheduledDate: Date,
  ): Promise<Booking | null> {
    return this.bookingRepo
      .createQueryBuilder('b')
      .where('b.establishment_id = :establishmentId', { establishmentId })
      .andWhere('b.customer_id = :customerId', { customerId })
      .andWhere('b.status IN (:...statuses)', {
        statuses: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
      })
      .andWhere(
        `DATE_TRUNC('week', b.scheduled_at) = DATE_TRUNC('week', :scheduledAt::timestamptz)`,
        { scheduledAt: scheduledDate.toISOString() },
      )
      .orderBy('b.scheduled_at', 'ASC')
      .getOne();
  }

  private mapBookingsWithServices(bookings: Booking[]): BookingWithServices[] {
    return bookings.map((b) => ({
      ...b,
      customerName: b.customer?.name ?? '',
      services:
        b.bookingServices?.map((bs) => ({
          id: bs.service.id,
          name: bs.service.name,
          price: bs.service.price,
          durationMinutes: bs.service.durationMinutes,
          status: bs.status,
        })) ?? [],
    }));
  }

  async updateBookingServiceStatus(
    bookingId: string,
    serviceId: string,
    establishmentId: string,
    status: BookingServiceStatus,
  ): Promise<BookingWithServices> {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId, establishmentId },
    });
    if (!booking) {
      throw new NotFoundException('Agendamento não encontrado');
    }

    const bookingService = await this.bookingServiceRepo.findOne({
      where: { bookingId, serviceId },
    });
    if (!bookingService) {
      throw new NotFoundException('Serviço não encontrado neste agendamento');
    }

    bookingService.status = status;
    await this.bookingServiceRepo.save(bookingService);

    const result = await this.findById(bookingId, establishmentId);
    if (!result) {
      throw new NotFoundException('Agendamento não encontrado');
    }
    return result;
  }

  private getISOWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }
}
