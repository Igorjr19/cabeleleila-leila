import { Booking } from '../entities/booking.entity';
import { BookingSuggestion, ServiceSummary } from '@cabeleleila/contracts';

export interface BookingWithServices extends Booking {
  services?: ServiceSummary[];
  suggestion?: BookingSuggestion;
}
