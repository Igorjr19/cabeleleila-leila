import { BookingStatus } from './common';

export enum BookingServiceStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  SKIPPED = 'SKIPPED',
}

export interface ServiceSummary {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
  status: BookingServiceStatus;
}

export interface UpdateBookingServiceStatusRequest {
  status: BookingServiceStatus;
}

export interface BookingResponse {
  id: string;
  establishmentId: string;
  customerId: string;
  customerName: string;
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

export type SlotUnavailableReason =
  | 'CLOSED'
  | 'LUNCH'
  | 'OCCUPIED'
  | 'PAST'
  | 'TOO_SOON'
  | 'CLOSING';

export interface AvailabilitySlot {
  /** Wall-clock start "HH:mm" in salon timezone. */
  time: string;
  /** ISO UTC timestamp the booking should be scheduled at. */
  startsAt: string;
  available: boolean;
  reason?: SlotUnavailableReason;
}

export interface AvailabilityResponse {
  /** YYYY-MM-DD in salon timezone. */
  date: string;
  isOpen: boolean;
  openTime: string | null;
  closeTime: string | null;
  lunchStart: string | null;
  lunchEnd: string | null;
  durationMinutes: number;
  slots: AvailabilitySlot[];
}
