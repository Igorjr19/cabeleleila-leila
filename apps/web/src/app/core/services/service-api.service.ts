import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  CreateServiceRequest,
  ServiceResponse,
  UpdateServiceRequest,
} from '@cabeleleila/contracts';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ServiceApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/services`;

  getServices() {
    return this.http.get<ServiceResponse[]>(this.base);
  }

  getServiceById(id: string) {
    return this.http.get<ServiceResponse>(`${this.base}/${id}`);
  }

  createService(dto: CreateServiceRequest) {
    return this.http.post<ServiceResponse>(this.base, dto);
  }

  updateService(id: string, dto: UpdateServiceRequest) {
    return this.http.patch<ServiceResponse>(`${this.base}/${id}`, dto);
  }

  deleteService(id: string) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  setServiceActive(id: string, active: boolean) {
    return this.http.patch<ServiceResponse>(`${this.base}/${id}/active`, {
      active,
    });
  }
}
