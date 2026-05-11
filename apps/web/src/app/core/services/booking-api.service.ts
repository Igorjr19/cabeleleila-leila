import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  AvailabilityResponse,
  BookingListFilters,
  BookingResponse,
  BookingSuggestion,
  CreateBookingRequest,
  PaginatedResponse,
  PaginationQuery,
  UpdateBookingRequest,
  UpdateBookingServiceStatusRequest,
  UpdateBookingStatusRequest,
  WeeklyStats,
} from '@cabeleleila/contracts';
import { environment } from '../../../environments/environment';

export interface BookingWithSuggestion extends BookingResponse {
  suggestion?: BookingSuggestion;
}

@Injectable({ providedIn: 'root' })
export class BookingApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/bookings`;

  createBooking(dto: CreateBookingRequest) {
    return this.http.post<BookingWithSuggestion>(this.base, dto);
  }

  getMyBookings(filters?: BookingListFilters, pagination?: PaginationQuery) {
    return this.http.get<PaginatedResponse<BookingResponse>>(
      `${this.base}/me`,
      { params: toParams({ ...filters, ...pagination }) },
    );
  }

  getAllBookings(filters?: BookingListFilters, pagination?: PaginationQuery) {
    return this.http.get<PaginatedResponse<BookingResponse>>(this.base, {
      params: toParams({ ...filters, ...pagination }),
    });
  }

  getBookingById(id: string) {
    return this.http.get<BookingResponse>(`${this.base}/${id}`);
  }

  checkSameWeek(dateIso: string) {
    return this.http.get<BookingResponse | null>(`${this.base}/same-week`, {
      params: new HttpParams().set('date', dateIso),
    });
  }

  getAvailability(
    date: string,
    durationMinutes: number,
    excludeBookingId?: string,
  ) {
    let params = new HttpParams()
      .set('date', date)
      .set('durationMinutes', durationMinutes.toString());
    if (excludeBookingId) {
      params = params.set('excludeBookingId', excludeBookingId);
    }
    return this.http.get<AvailabilityResponse>(`${this.base}/availability`, {
      params,
    });
  }

  updateBooking(id: string, dto: UpdateBookingRequest) {
    return this.http.patch<BookingResponse>(`${this.base}/${id}`, dto);
  }

  updateBookingStatus(id: string, dto: UpdateBookingStatusRequest) {
    return this.http.patch<BookingResponse>(`${this.base}/${id}/status`, dto);
  }

  updateBookingServiceStatus(
    bookingId: string,
    serviceId: string,
    dto: UpdateBookingServiceStatusRequest,
  ) {
    return this.http.patch<BookingResponse>(
      `${this.base}/${bookingId}/services/${serviceId}/status`,
      dto,
    );
  }

  cancelBooking(id: string) {
    return this.http.put<BookingResponse>(`${this.base}/${id}/cancel`, {});
  }

  getWeeklyStats(weekOf?: string) {
    const params = weekOf ? new HttpParams().set('weekOf', weekOf) : undefined;
    return this.http.get<WeeklyStats>(`${this.base}/dashboard/weekly`, {
      params,
    });
  }
}

function toParams(
  filters?: Record<string, string | number | undefined | null>,
): HttpParams {
  let params = new HttpParams();
  if (!filters) return params;
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== null) params = params.set(k, String(v));
  }
  return params;
}
