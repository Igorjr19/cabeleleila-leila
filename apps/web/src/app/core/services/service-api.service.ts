import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  CreateServiceRequest,
  PaginatedResponse,
  PaginationQuery,
  ServiceResponse,
  UpdateServiceRequest,
} from '@cabeleleila/contracts';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ServiceApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/services`;

  /** Lista paginada. Use `getAllServices()` para receber só o array. */
  listServices(options?: PaginationQuery) {
    let params = new HttpParams();
    if (options?.page) params = params.set('page', String(options.page));
    if (options?.limit) params = params.set('limit', String(options.limit));
    return this.http.get<PaginatedResponse<ServiceResponse>>(this.base, {
      params,
    });
  }

  /**
   * Helper para fluxos que precisam do catálogo inteiro (wizard, catálogo
   * público, dialog de seleção). Pega tudo até o limite máximo do backend.
   */
  getServices() {
    return this.listServices({ page: 1, limit: 100 }).pipe(
      map((res) => res.data),
    );
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
