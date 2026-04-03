import { UpdateBookingStatusRequest } from '@cabeleleila/contracts';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { BookingStatus } from '../../bookings/entities/booking.entity';

export class UpdateBookingStatusDto implements UpdateBookingStatusRequest {
  @ApiProperty({
    example: 'CONFIRMED',
    description: 'Novo status do agendamento',
    enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'FINISHED'],
  })
  @IsEnum(BookingStatus)
  status: BookingStatus;
}
