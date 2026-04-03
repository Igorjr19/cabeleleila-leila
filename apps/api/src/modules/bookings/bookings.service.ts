import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BusinessHours } from '../establishment/entities/establishment.entity';
import { EstablishmentService } from '../establishment/establishment.service';
import { ServicesService } from '../services/services.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ListBookingsQueryDto } from './dto/list-bookings-query.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { BookingService } from './entities/booking-service.entity';
import { Booking, BookingStatus } from './entities/booking.entity';

export interface BookingSuggestion {
  hasSameWeekBooking: boolean;
  suggestedDate: string | null;
  existingBookingId: string | null;
}

export interface WeeklyStats {
  weekStart: string;
  weekEnd: string;
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  finishedBookings: number;
  totalRevenue: number;
}

export interface BookingWithServices extends Booking {
  services?: {
    id: string;
    name: string;
    price: number;
    durationMinutes: number;
  }[];
  suggestion?: BookingSuggestion;
}

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(BookingService)
    private readonly bookingServiceRepo: Repository<BookingService>,
    private readonly servicesService: ServicesService,
    private readonly establishmentService: EstablishmentService,
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

    this.validateBusinessHours(scheduledDate, config.business_hours);

    if (!isAdmin) {
      this.validateMinDaysAhead(
        scheduledDate,
        config.min_days_for_online_update,
      );
    }

    const services = await this.servicesService.findByIdsAndEstablishment(
      dto.serviceIds,
      establishmentId,
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
          manager.create(BookingService, {
            bookingId: savedBooking.id,
            serviceId: service.id,
            priceAtBooking: service.price,
          }),
        );
      }

      return savedBooking;
    });

    return {
      ...saved,
      services: services.map((s) => ({
        id: s.id,
        name: s.name,
        price: s.price,
        durationMinutes: s.durationMinutes,
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
      relations: ['bookingServices'],
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
        config.min_days_for_online_update,
      );
    }

    if (dto.scheduledAt) {
      const newDate = new Date(dto.scheduledAt);
      if (newDate <= new Date()) {
        throw new BadRequestException('Nova data deve estar no futuro');
      }
      this.validateBusinessHours(newDate, config.business_hours);
      if (!isAdmin) {
        this.validateMinDaysAhead(newDate, config.min_days_for_online_update);
      }
      booking.scheduledAt = newDate;
    }

    await this.bookingRepo.save(booking);

    if (dto.serviceIds && dto.serviceIds.length > 0) {
      const services = await this.servicesService.findByIdsAndEstablishment(
        dto.serviceIds,
        establishmentId,
      );
      await this.bookingServiceRepo.delete({ bookingId });
      for (const service of services) {
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

  async updateStatus(
    bookingId: string,
    establishmentId: string,
    dto: UpdateBookingStatusDto,
  ): Promise<Booking> {
    const booking = await this.bookingRepo.findOneBy({
      id: bookingId,
      establishmentId,
    });
    if (!booking) {
      throw new NotFoundException('Agendamento não encontrado');
    }
    booking.status = dto.status;
    return this.bookingRepo.save(booking);
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
      relations: ['bookingServices', 'bookingServices.service'],
    });

    if (!booking) {
      return null;
    }

    return {
      ...booking,
      services:
        booking.bookingServices?.map((bs) => ({
          id: bs.service.id,
          name: bs.service.name,
          price: bs.service.price,
          durationMinutes: bs.service.durationMinutes,
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
        'Agendamento já está cancelado ou finalizado',
      );
    }

    const config = await this.establishmentService.getConfig(establishmentId);
    this.validateMinDaysAhead(
      booking.scheduledAt,
      config.min_days_for_online_update,
    );

    booking.status = BookingStatus.CANCELLED;
    await this.bookingRepo.save(booking);

    return {
      ...booking,
      services:
        booking.bookingServices?.map((bs) => ({
          id: bs.service.id,
          name: bs.service.name,
          price: bs.service.price,
          durationMinutes: bs.service.durationMinutes,
        })) ?? [],
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
    hoursArray: BusinessHours[],
  ): void {
    const dayOfWeek = scheduledDate.getDay();
    const hours = hoursArray.find((h) => h.day_of_week === dayOfWeek);

    if (!hours) {
      throw new BadRequestException('Salão fechado neste dia da semana');
    }

    const toMin = (hhmm: string): number => {
      const [h, m] = hhmm.split(':').map(Number);
      return h * 60 + m;
    };
    const scheduledMinutes =
      scheduledDate.getHours() * 60 + scheduledDate.getMinutes();

    if (
      scheduledMinutes < toMin(hours.open_time) ||
      scheduledMinutes >= toMin(hours.close_time)
    ) {
      throw new BadRequestException(
        `Horário fora do funcionamento do salão (${hours.open_time}–${hours.close_time})`,
      );
    }
    if (hours.lunch_start && hours.lunch_end) {
      if (
        scheduledMinutes >= toMin(hours.lunch_start) &&
        scheduledMinutes < toMin(hours.lunch_end)
      ) {
        throw new BadRequestException(
          `Horário de almoço (${hours.lunch_start}–${hours.lunch_end}). Escolha outro horário.`,
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

  private async checkSameWeekSuggestion(
    establishmentId: string,
    customerId: string,
    scheduledDate: Date,
  ): Promise<BookingSuggestion> {
    const existing = await this.bookingRepo
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

  private mapBookingsWithServices(bookings: Booking[]): BookingWithServices[] {
    return bookings.map((b) => ({
      ...b,
      services:
        b.bookingServices?.map((bs) => ({
          id: bs.service.id,
          name: bs.service.name,
          price: bs.service.price,
          durationMinutes: bs.service.durationMinutes,
        })) ?? [],
    }));
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
