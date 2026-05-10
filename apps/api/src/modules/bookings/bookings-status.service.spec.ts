import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EstablishmentService } from '../establishment/establishment.service';
import { ServicesService } from '../services/services.service';
import { TimeBlocksService } from '../time-blocks/time-blocks.service';
import { BookingsService } from './bookings.service';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { BookingService as BookingEntityService } from './entities/booking-service.entity';
import { Booking, BookingStatus } from './entities/booking.entity';

const EST_ID = 'est-uuid';
const BOOKING_ID = 'booking-uuid';

const makeBooking = (
  status: BookingStatus,
  scheduledAtOffsetDays = 7,
): Booking =>
  ({
    id: BOOKING_ID,
    establishmentId: EST_ID,
    customerId: 'customer-uuid',
    status,
    scheduledAt: new Date(Date.now() + scheduledAtOffsetDays * 86_400_000),
    createdAt: new Date(),
    bookingServices: [],
  }) as unknown as Booking;

describe('BookingsService — updateStatus() state machine', () => {
  let service: BookingsService;

  const mockBookingRepo = {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockBookingServiceRepo = {
    count: jest.fn().mockResolvedValue(0),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
    findOne: jest.fn(),
  };

  // findById is called at the end of updateStatus → return the booking with services array
  const findByIdResult = (status: BookingStatus) => ({
    ...makeBooking(status),
    customerName: 'Cliente Teste',
    services: [],
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockBookingServiceRepo.count.mockResolvedValue(0);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: getRepositoryToken(Booking), useValue: mockBookingRepo },
        {
          provide: getRepositoryToken(BookingEntityService),
          useValue: mockBookingServiceRepo,
        },
        { provide: ServicesService, useValue: {} },
        { provide: EstablishmentService, useValue: {} },
        { provide: TimeBlocksService, useValue: {} },
        { provide: DataSource, useValue: {} },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
  });

  function setupTransition(
    initial: BookingStatus,
    target: BookingStatus,
    confirmedCount = 1,
  ): void {
    const booking = makeBooking(initial);
    mockBookingRepo.findOne.mockResolvedValue(booking);
    mockBookingRepo.save.mockResolvedValue({ ...booking, status: target });
    // For PENDING → CONFIRMED, BookingsService checks pending count and confirmed count
    mockBookingServiceRepo.count
      .mockResolvedValueOnce(0) // stillPending count
      .mockResolvedValueOnce(confirmedCount); // anyConfirmed count
    // findById call at the end
    jest
      .spyOn(service, 'findById')
      .mockResolvedValue(findByIdResult(target) as never);
  }

  // ── Transições válidas ─────────────────────────────────────────────────────

  it('PENDING → CONFIRMED (válido)', async () => {
    setupTransition(BookingStatus.PENDING, BookingStatus.CONFIRMED);

    const dto: UpdateBookingStatusDto = { status: BookingStatus.CONFIRMED };
    const result = await service.updateStatus(BOOKING_ID, EST_ID, dto);

    expect(result.status).toBe(BookingStatus.CONFIRMED);
    expect(mockBookingRepo.save).toHaveBeenCalled();
  });

  it('PENDING → CANCELLED (válido)', async () => {
    setupTransition(BookingStatus.PENDING, BookingStatus.CANCELLED);

    const dto: UpdateBookingStatusDto = { status: BookingStatus.CANCELLED };
    const result = await service.updateStatus(BOOKING_ID, EST_ID, dto);

    expect(result.status).toBe(BookingStatus.CANCELLED);
  });

  it('CONFIRMED → FINISHED (válido) quando o horário marcado já passou', async () => {
    // FINISHED only allowed if scheduledAt is in the past
    const booking = makeBooking(BookingStatus.CONFIRMED, -1);
    mockBookingRepo.findOne.mockResolvedValue(booking);
    mockBookingRepo.save.mockResolvedValue({
      ...booking,
      status: BookingStatus.FINISHED,
    });
    jest
      .spyOn(service, 'findById')
      .mockResolvedValue(findByIdResult(BookingStatus.FINISHED) as never);

    const dto: UpdateBookingStatusDto = { status: BookingStatus.FINISHED };
    const result = await service.updateStatus(BOOKING_ID, EST_ID, dto);

    expect(result.status).toBe(BookingStatus.FINISHED);
  });

  it('CONFIRMED → CANCELLED (válido)', async () => {
    setupTransition(BookingStatus.CONFIRMED, BookingStatus.CANCELLED);

    const dto: UpdateBookingStatusDto = { status: BookingStatus.CANCELLED };
    const result = await service.updateStatus(BOOKING_ID, EST_ID, dto);

    expect(result.status).toBe(BookingStatus.CANCELLED);
  });

  // ── Transições inválidas ───────────────────────────────────────────────────

  it('CANCELLED → PENDING (inválido) lança BadRequestException', async () => {
    mockBookingRepo.findOne.mockResolvedValue(
      makeBooking(BookingStatus.CANCELLED),
    );

    await expect(
      service.updateStatus(BOOKING_ID, EST_ID, {
        status: BookingStatus.PENDING,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('CANCELLED → CONFIRMED (inválido) lança BadRequestException', async () => {
    mockBookingRepo.findOne.mockResolvedValue(
      makeBooking(BookingStatus.CANCELLED),
    );

    await expect(
      service.updateStatus(BOOKING_ID, EST_ID, {
        status: BookingStatus.CONFIRMED,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('FINISHED → PENDING (inválido) lança BadRequestException', async () => {
    mockBookingRepo.findOne.mockResolvedValue(
      makeBooking(BookingStatus.FINISHED),
    );

    await expect(
      service.updateStatus(BOOKING_ID, EST_ID, {
        status: BookingStatus.PENDING,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('FINISHED → CANCELLED (inválido) lança BadRequestException', async () => {
    mockBookingRepo.findOne.mockResolvedValue(
      makeBooking(BookingStatus.FINISHED),
    );

    await expect(
      service.updateStatus(BOOKING_ID, EST_ID, {
        status: BookingStatus.CANCELLED,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('PENDING → FINISHED (inválido: pula CONFIRMED) lança BadRequestException', async () => {
    mockBookingRepo.findOne.mockResolvedValue(
      makeBooking(BookingStatus.PENDING),
    );

    await expect(
      service.updateStatus(BOOKING_ID, EST_ID, {
        status: BookingStatus.FINISHED,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // ── Booking não encontrado ─────────────────────────────────────────────────

  it('lança NotFoundException quando booking não existe', async () => {
    mockBookingRepo.findOne.mockResolvedValue(null);

    await expect(
      service.updateStatus(BOOKING_ID, EST_ID, {
        status: BookingStatus.CONFIRMED,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('não processa booking de outro estabelecimento', async () => {
    mockBookingRepo.findOne.mockResolvedValue(null); // scoped by establishmentId

    await expect(
      service.updateStatus(BOOKING_ID, 'outro-est', {
        status: BookingStatus.CONFIRMED,
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
