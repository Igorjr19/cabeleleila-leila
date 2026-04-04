import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EstablishmentService } from '../establishment/establishment.service';
import { ServicesService } from '../services/services.service';
import { BookingsService } from './bookings.service';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { BookingService as BookingEntityService } from './entities/booking-service.entity';
import { Booking, BookingStatus } from './entities/booking.entity';

const EST_ID = 'est-uuid';
const BOOKING_ID = 'booking-uuid';

const makeBooking = (status: BookingStatus): Booking =>
  ({
    id: BOOKING_ID,
    establishmentId: EST_ID,
    customerId: 'customer-uuid',
    status,
    scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    bookingServices: [],
  }) as Booking;

describe('BookingsService — updateStatus() state machine', () => {
  let service: BookingsService;

  const mockBookingRepo = {
    findOneBy: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: getRepositoryToken(Booking), useValue: mockBookingRepo },
        {
          provide: getRepositoryToken(BookingEntityService),
          useValue: {},
        },
        {
          provide: ServicesService,
          useValue: {},
        },
        {
          provide: EstablishmentService,
          useValue: {},
        },
        {
          provide: DataSource,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
  });

  // ── Transições válidas ─────────────────────────────────────────────────────

  it('PENDING → CONFIRMED (válido)', async () => {
    const booking = makeBooking(BookingStatus.PENDING);
    mockBookingRepo.findOneBy.mockResolvedValue(booking);
    mockBookingRepo.save.mockResolvedValue({
      ...booking,
      status: BookingStatus.CONFIRMED,
    });

    const dto: UpdateBookingStatusDto = { status: BookingStatus.CONFIRMED };
    const result = await service.updateStatus(BOOKING_ID, EST_ID, dto);

    expect(result.status).toBe(BookingStatus.CONFIRMED);
    expect(mockBookingRepo.save).toHaveBeenCalled();
  });

  it('PENDING → CANCELLED (válido)', async () => {
    const booking = makeBooking(BookingStatus.PENDING);
    mockBookingRepo.findOneBy.mockResolvedValue(booking);
    mockBookingRepo.save.mockResolvedValue({
      ...booking,
      status: BookingStatus.CANCELLED,
    });

    const dto: UpdateBookingStatusDto = { status: BookingStatus.CANCELLED };
    const result = await service.updateStatus(BOOKING_ID, EST_ID, dto);

    expect(result.status).toBe(BookingStatus.CANCELLED);
  });

  it('CONFIRMED → FINISHED (válido)', async () => {
    const booking = makeBooking(BookingStatus.CONFIRMED);
    mockBookingRepo.findOneBy.mockResolvedValue(booking);
    mockBookingRepo.save.mockResolvedValue({
      ...booking,
      status: BookingStatus.FINISHED,
    });

    const dto: UpdateBookingStatusDto = { status: BookingStatus.FINISHED };
    const result = await service.updateStatus(BOOKING_ID, EST_ID, dto);

    expect(result.status).toBe(BookingStatus.FINISHED);
  });

  it('CONFIRMED → CANCELLED (válido)', async () => {
    const booking = makeBooking(BookingStatus.CONFIRMED);
    mockBookingRepo.findOneBy.mockResolvedValue(booking);
    mockBookingRepo.save.mockResolvedValue({
      ...booking,
      status: BookingStatus.CANCELLED,
    });

    const dto: UpdateBookingStatusDto = { status: BookingStatus.CANCELLED };
    const result = await service.updateStatus(BOOKING_ID, EST_ID, dto);

    expect(result.status).toBe(BookingStatus.CANCELLED);
  });

  // ── Transições inválidas ───────────────────────────────────────────────────

  it('CANCELLED → PENDING (inválido) lança BadRequestException', async () => {
    const booking = makeBooking(BookingStatus.CANCELLED);
    mockBookingRepo.findOneBy.mockResolvedValue(booking);

    const dto: UpdateBookingStatusDto = { status: BookingStatus.PENDING };

    await expect(service.updateStatus(BOOKING_ID, EST_ID, dto)).rejects.toThrow(
      BadRequestException,
    );

    await expect(service.updateStatus(BOOKING_ID, EST_ID, dto)).rejects.toThrow(
      'Transição de status inválida',
    );
  });

  it('CANCELLED → CONFIRMED (inválido) lança BadRequestException', async () => {
    const booking = makeBooking(BookingStatus.CANCELLED);
    mockBookingRepo.findOneBy.mockResolvedValue(booking);

    await expect(
      service.updateStatus(BOOKING_ID, EST_ID, {
        status: BookingStatus.CONFIRMED,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('FINISHED → PENDING (inválido) lança BadRequestException', async () => {
    const booking = makeBooking(BookingStatus.FINISHED);
    mockBookingRepo.findOneBy.mockResolvedValue(booking);

    await expect(
      service.updateStatus(BOOKING_ID, EST_ID, {
        status: BookingStatus.PENDING,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('FINISHED → CANCELLED (inválido) lança BadRequestException', async () => {
    const booking = makeBooking(BookingStatus.FINISHED);
    mockBookingRepo.findOneBy.mockResolvedValue(booking);

    await expect(
      service.updateStatus(BOOKING_ID, EST_ID, {
        status: BookingStatus.CANCELLED,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('PENDING → FINISHED (inválido: pula CONFIRMED) lança BadRequestException', async () => {
    const booking = makeBooking(BookingStatus.PENDING);
    mockBookingRepo.findOneBy.mockResolvedValue(booking);

    await expect(
      service.updateStatus(BOOKING_ID, EST_ID, {
        status: BookingStatus.FINISHED,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // ── Booking não encontrado ─────────────────────────────────────────────────

  it('lança NotFoundException quando booking não existe', async () => {
    mockBookingRepo.findOneBy.mockResolvedValue(null);

    await expect(
      service.updateStatus(BOOKING_ID, EST_ID, {
        status: BookingStatus.CONFIRMED,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('não processa booking de outro estabelecimento', async () => {
    mockBookingRepo.findOneBy.mockResolvedValue(null); // scoped by establishmentId

    await expect(
      service.updateStatus(BOOKING_ID, 'outro-est', {
        status: BookingStatus.CONFIRMED,
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
