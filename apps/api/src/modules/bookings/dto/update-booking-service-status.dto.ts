import { BookingServiceStatus } from '@cabeleleila/contracts';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export class UpdateBookingServiceStatusDto {
  @ApiProperty({ enum: BookingServiceStatus })
  @IsEnum(BookingServiceStatus)
  status: BookingServiceStatus;
}
