import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface BusinessHours {
  open: string;
  close: string;
  lunchStart: string;
  lunchEnd: string;
}

export interface EstablishmentConfig {
  min_days_for_online_update: number;
  business_hours: BusinessHours;
}

export interface EstablishmentResponse {
  id: string;
  name: string;
  cnpj: string;
  config: EstablishmentConfig;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class EstablishmentApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/establishment`;

  getConfig() {
    return this.http.get<EstablishmentResponse>(`${this.base}/config`);
  }

  updateConfig(dto: EstablishmentConfig) {
    return this.http.patch<EstablishmentResponse>(`${this.base}/config`, dto);
  }
}
