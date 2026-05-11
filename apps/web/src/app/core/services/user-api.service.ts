import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { PaginatedResponse, PaginationQuery } from '@cabeleleila/contracts';
import { environment } from '../../../environments/environment';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string;
}

export interface UpdateProfileRequest {
  name?: string;
  phone?: string;
}

@Injectable({ providedIn: 'root' })
export class UserApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/users`;

  getProfile() {
    return this.http.get<UserProfile>(`${this.base}/me`);
  }

  updateProfile(dto: UpdateProfileRequest) {
    return this.http.put<UserProfile>(`${this.base}/me`, dto);
  }

  listCustomers(options?: { search?: string } & PaginationQuery) {
    let params = new HttpParams();
    if (options?.search) params = params.set('q', options.search);
    if (options?.page) params = params.set('page', String(options.page));
    if (options?.limit) params = params.set('limit', String(options.limit));
    return this.http.get<
      PaginatedResponse<CustomerWithStats> & { summary: CustomersSummary }
    >(`${this.base}/customers`, { params });
  }
}

export interface CustomersSummary {
  totalCustomers: number;
  activeCustomers: number;
  inactive30Days: number;
  averageTicket: number;
}

export interface CustomerWithStats {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  totalBookings: number;
  lastBookingAt: string | null;
  totalSpent: number;
  averageTicket: number;
  averageServicesPerBooking: number;
  averageDurationMinutes: number;
}
