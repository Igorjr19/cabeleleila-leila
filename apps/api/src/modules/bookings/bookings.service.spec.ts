import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EstablishmentConfig } from '../establishment/entities/establishment.entity';
import { EstablishmentService } from '../establishment/establishment.service';
import { ServicesService } from '../services/services.service';
import { BookingsService } from './bookings.service';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { BookingService } from './entities/booking-service.entity';
import { Booking, BookingStatus } from './entities/booking.entity';

const DEFAULT_CONFIG: EstablishmentConfig = {
  min_days_for_online_update: 2,
  business_hours: Array.from({ length: 7 }).map((_, i) => ({
    day_of_week: i,
    open_time: '08:00',
    close_time: '18:00',
    lunch_start: '12:00',
    lunch_end: '13:00',
  })),
};

const EST_ID = 'est-uuid';
const CUSTOMER_ID = 'customer-uuid';
const BOOKING_ID = 'booking-uuid';

// Date helpers
const daysFromNow = (days: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(10, 0, 0, 0); // 10:00 — dentro do horário de funcionamento
  return d;
};

const makeBooking = (overrides: Partial<Booking> = {}): Booking =>
  ({
    id: BOOKING_ID,
    establishmentId: EST_ID,
    customerId: CUSTOMER_ID,
    scheduledAt: daysFromNow(5),
    status: BookingStatus.PENDING,
    createdAt: new Date(),
    bookingServices: [],
    ...overrides,
  }) as Booking;

describe('BookingsService', () => {
  let service: BookingsService;

  const mockBookingRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockBookingServiceRepo = {
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockServicesService = {
    findByIdsAndEstablishment: jest.fn(),
  };

  const mockEstablishmentService = {
    getConfig: jest.fn().mockResolvedValue(DEFAULT_CONFIG),
  };

  const mockEntityManager = {
    create: jest.fn((entity: unknown, data: Record<string, unknown>) => ({
      ...data,
    })),
    save: jest.fn((data: Record<string, unknown>) =>
      Promise.resolve({ ...data, id: BOOKING_ID }),
    ),
  };

  const mockDataSource = {
    transaction: jest.fn(
      async (cb: (manager: typeof mockEntityManager) => Promise<unknown>) =>
        cb(mockEntityManager),
    ),
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getMany: jest.fn(),
    getRawOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockBookingRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: getRepositoryToken(Booking), useValue: mockBookingRepo },
        {
          provide: getRepositoryToken(BookingService),
          useValue: mockBookingServiceRepo,
        },
        { provide: ServicesService, useValue: mockServicesService },
        { provide: EstablishmentService, useValue: mockEstablishmentService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
  });

  // ── create() ──────────────────────────────────────────────────────────────

  describe('create()', () => {
    const mockService = {
      id: 's1',
      name: 'Corte',
      price: 80,
      durationMinutes: 60,
    };

    beforeEach(() => {
      mockServicesService.findByIdsAndEstablishment.mockResolvedValue([
        mockService,
      ]);
      mockQueryBuilder.getOne.mockResolvedValue(null); // sem sugestão
    });

    it('lança BadRequestException quando scheduledAt está no passado', async () => {
      const past = new Date();
      past.setDate(past.getDate() - 1);

      await expect(
        service.create(
          EST_ID,
          CUSTOMER_ID,
          { scheduledAt: past.toISOString(), serviceIds: ['s1'] },
          false,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('lança BadRequestException quando fora do horário de funcionamento', async () => {
      const d = daysFromNow(5);
      d.setHours(7, 0); // antes das 08:00

      await expect(
        service.create(
          EST_ID,
          CUSTOMER_ID,
          { scheduledAt: d.toISOString(), serviceIds: ['s1'] },
          false,
        ),
      ).rejects.toThrow(/funcionamento/);
    });

    it('lança BadRequestException quando no horário de almoço', async () => {
      const d = daysFromNow(5);
      d.setHours(12, 30); // dentro do almoço 12:00–13:00

      await expect(
        service.create(
          EST_ID,
          CUSTOMER_ID,
          { scheduledAt: d.toISOString(), serviceIds: ['s1'] },
          false,
        ),
      ).rejects.toThrow(/almoço/);
    });

    it('lança BadRequestException quando regra dos 2 dias violada (CUSTOMER)', async () => {
      const tomorrow = daysFromNow(1); // < 2 dias

      await expect(
        service.create(
          EST_ID,
          CUSTOMER_ID,
          { scheduledAt: tomorrow.toISOString(), serviceIds: ['s1'] },
          false,
        ),
      ).rejects.toThrow(/antecedência/);
    });

    it('NÃO lança quando regra dos 2 dias violada e isAdmin=true', async () => {
      const tomorrow = daysFromNow(1); // < 2 dias

      await expect(
        service.create(
          EST_ID,
          CUSTOMER_ID,
          { scheduledAt: tomorrow.toISOString(), serviceIds: ['s1'] },
          true,
        ),
      ).resolves.not.toThrow();
    });

    it('lança BadRequestException quando serviceId não pertence ao establishment', async () => {
      mockServicesService.findByIdsAndEstablishment.mockRejectedValue(
        new BadRequestException('Um ou mais serviços não foram encontrados'),
      );

      await expect(
        service.create(
          EST_ID,
          CUSTOMER_ID,
          {
            scheduledAt: daysFromNow(5).toISOString(),
            serviceIds: ['invalid'],
          },
          false,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('salva priceAtBooking igual ao price do serviço no momento do agendamento', async () => {
      await service.create(
        EST_ID,
        CUSTOMER_ID,
        { scheduledAt: daysFromNow(5).toISOString(), serviceIds: ['s1'] },
        false,
      );

      expect(mockEntityManager.save).toHaveBeenCalledWith(
        expect.objectContaining({ priceAtBooking: mockService.price }),
      );
    });

    it('retorna suggestion.hasSameWeekBooking=true quando há booking PENDING na mesma semana', async () => {
      const existingBooking = makeBooking({
        id: 'existing-id',
        scheduledAt: daysFromNow(3),
      });
      mockQueryBuilder.getOne.mockResolvedValue(existingBooking);

      const result = await service.create(
        EST_ID,
        CUSTOMER_ID,
        { scheduledAt: daysFromNow(5).toISOString(), serviceIds: ['s1'] },
        false,
      );

      expect(result.suggestion).toEqual({
        hasSameWeekBooking: true,
        suggestedDate: existingBooking.scheduledAt.toISOString(),
        existingBookingId: existingBooking.id,
      });
    });

    it('retorna suggestion.hasSameWeekBooking=false quando não há booking ativo na semana', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      const result = await service.create(
        EST_ID,
        CUSTOMER_ID,
        { scheduledAt: daysFromNow(5).toISOString(), serviceIds: ['s1'] },
        false,
      );

      expect(result.suggestion).toEqual({
        hasSameWeekBooking: false,
        suggestedDate: null,
        existingBookingId: null,
      });
    });
  });

  // ── cancel() ──────────────────────────────────────────────────────────────

  describe('cancel()', () => {
    it('lança BadRequestException quando < min_days de antecedência', async () => {
      const booking = makeBooking({ scheduledAt: daysFromNow(1) }); // 1 dia < 2 dias
      mockBookingRepo.findOne.mockResolvedValue(booking);

      await expect(
        service.cancel(BOOKING_ID, EST_ID, CUSTOMER_ID),
      ).rejects.toThrow(/antecedência/);
    });

    it('lança NotFoundException quando booking não encontrado', async () => {
      mockBookingRepo.findOne.mockResolvedValue(null);

      await expect(
        service.cancel(BOOKING_ID, EST_ID, CUSTOMER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('lança BadRequestException quando booking já está cancelado', async () => {
      const booking = makeBooking({
        status: BookingStatus.CANCELLED,
        scheduledAt: daysFromNow(5),
      });
      mockBookingRepo.findOne.mockResolvedValue(booking);

      await expect(
        service.cancel(BOOKING_ID, EST_ID, CUSTOMER_ID),
      ).rejects.toThrow(/cancelado/);
    });
  });

  // ── updateStatus() ────────────────────────────────────────────────────────

  describe('updateStatus()', () => {
    it('lança NotFoundException quando booking não existe', async () => {
      mockBookingRepo.findOneBy.mockResolvedValue(null);

      await expect(
        service.updateStatus(BOOKING_ID, EST_ID, {
          status: BookingStatus.CONFIRMED,
        } as UpdateBookingStatusDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('atualiza o status com sucesso', async () => {
      const booking = makeBooking();
      mockBookingRepo.findOneBy.mockResolvedValue(booking);
      mockBookingRepo.save.mockResolvedValue({
        ...booking,
        status: BookingStatus.CONFIRMED,
      });

      const result = await service.updateStatus(BOOKING_ID, EST_ID, {
        status: BookingStatus.CONFIRMED,
      } as UpdateBookingStatusDto);

      expect(result.status).toBe(BookingStatus.CONFIRMED);
    });
  });

  // ── getWeeklyStats() ──────────────────────────────────────────────────────

  describe('getWeeklyStats()', () => {
    it('retorna totalRevenue excluindo bookings CANCELLED', async () => {
      mockQueryBuilder.getRawOne.mockResolvedValue({
        weekStart: new Date().toISOString(),
        totalBookings: '5',
        confirmedBookings: '2',
        cancelledBookings: '1',
        finishedBookings: '1',
        totalRevenue: '240.00', // cancelados excluídos na query SQL
      });

      const stats = await service.getWeeklyStats(EST_ID);

      expect(stats.totalRevenue).toBe(240);
      expect(stats.cancelledBookings).toBe(1);
      expect(stats.totalBookings).toBe(5);
    });

    it('retorna zeros quando não há agendamentos na semana', async () => {
      mockQueryBuilder.getRawOne.mockResolvedValue(null);

      const stats = await service.getWeeklyStats(EST_ID);

      expect(stats.totalBookings).toBe(0);
      expect(stats.totalRevenue).toBe(0);
    });
  });

  // ── update() ─────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('lança BadRequestException quando booking atual viola regra dos 2 dias', async () => {
      const booking = makeBooking({ scheduledAt: daysFromNow(1) }); // 1 dia < 2 dias
      mockBookingRepo.findOne.mockResolvedValue(booking);

      await expect(
        service.update(BOOKING_ID, EST_ID, CUSTOMER_ID, {}, false),
      ).rejects.toThrow(/antecedência/);
    });

    it('lança NotFoundException quando booking não encontrado', async () => {
      mockBookingRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update(BOOKING_ID, EST_ID, CUSTOMER_ID, {}, false),
      ).rejects.toThrow(NotFoundException);
    });

    it('lança BadRequestException para booking CANCELLED', async () => {
      const booking = makeBooking({ status: BookingStatus.CANCELLED });
      mockBookingRepo.findOne.mockResolvedValue(booking);

      await expect(
        service.update(BOOKING_ID, EST_ID, CUSTOMER_ID, {}, false),
      ).rejects.toThrow(/cancelado/);
    });
  });
});
