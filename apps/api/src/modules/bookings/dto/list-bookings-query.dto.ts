import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { BookingStatus } from '../../bookings/entities/booking.entity';

export class ListBookingsQueryDto {
  @ApiProperty({
    example: '2026-04-01T00:00:00Z',
    description: 'Data inicial do filtro',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    example: '2026-04-30T23:59:59Z',
    description: 'Data final do filtro',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    example: 'CONFIRMED',
    description: 'Filtrar por status do agendamento',
    required: false,
    enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'FINISHED'],
  })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;
}
