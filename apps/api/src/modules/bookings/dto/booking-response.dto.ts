import { ApiProperty } from '@nestjs/swagger';
import {
  BookingResponse,
  BookingStatus,
  ServiceSummary,
  BookingSuggestion,
} from '@cabeleleila/contracts';

export class ServiceSummaryDto implements ServiceSummary {
  @ApiProperty()
  id: string;
  @ApiProperty()
  name: string;
  @ApiProperty()
  price: number;
  @ApiProperty()
  durationMinutes: number;
}

export class BookingSuggestionDto implements BookingSuggestion {
  @ApiProperty()
  hasSameWeekBooking: boolean;
  @ApiProperty({ nullable: true })
  suggestedDate: string | null;
  @ApiProperty({ nullable: true })
  existingBookingId: string | null;
}

export class BookingResponseDto implements BookingResponse {
  @ApiProperty()
  id: string;
  @ApiProperty()
  establishmentId: string;
  @ApiProperty()
  customerId: string;
  @ApiProperty()
  scheduledAt: string;
  @ApiProperty({ enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'FINISHED'] })
  status: BookingStatus;
  @ApiProperty()
  createdAt: string;
  @ApiProperty({ type: [ServiceSummaryDto] })
  services: ServiceSummaryDto[];
  @ApiProperty({ type: BookingSuggestionDto, required: false })
  suggestion?: BookingSuggestionDto;
}
