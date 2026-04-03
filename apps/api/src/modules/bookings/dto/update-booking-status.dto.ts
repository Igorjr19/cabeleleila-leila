import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { BookingStatus } from '../../bookings/entities/booking.entity';

export class UpdateBookingStatusDto {
  @ApiProperty({
    example: 'CONFIRMED',
    description: 'Novo status do agendamento',
    enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'FINISHED'],
  })
  @IsEnum(BookingStatus)
  status: BookingStatus;
}
