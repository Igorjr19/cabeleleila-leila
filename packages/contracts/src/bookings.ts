import { BookingStatus } from './common';

export interface ServiceSummary {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
}

export interface BookingResponse {
  id: string;
  establishmentId: string;
  customerId: string;
  scheduledAt: string;
  status: BookingStatus;
  createdAt: string;
  services: ServiceSummary[];
}

export interface CreateBookingRequest {
  serviceIds: string[];
  scheduledAt: string;
}

export interface UpdateBookingRequest {
  scheduledAt?: string;
  serviceIds?: string[];
}

export interface UpdateBookingStatusRequest {
  status: BookingStatus;
}

export interface BookingListFilters {
  startDate?: string;
  endDate?: string;
  status?: BookingStatus;
}

export interface BookingSuggestion {
  hasSameWeekBooking: boolean;
  suggestedDate: string | null;
  existingBookingId: string | null;
}
