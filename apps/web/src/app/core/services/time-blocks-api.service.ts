import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { PaginatedResponse, PaginationQuery } from '@cabeleleila/contracts';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TimeBlock {
  id: string;
  establishmentId: string;
  startsAt: string;
  endsAt: string;
  reason: string | null;
  createdAt: string;
}

export interface CreateTimeBlockRequest {
  startsAt: string;
  endsAt: string;
  reason?: string;
}

@Injectable({ providedIn: 'root' })
export class TimeBlocksApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/time-blocks`;

  /** Lista paginada. Use `listAll()` quando precisar de todos os bloqueios. */
  listPaginated(options?: PaginationQuery) {
    let params = new HttpParams();
    if (options?.page) params = params.set('page', String(options.page));
    if (options?.limit) params = params.set('limit', String(options.limit));
    return this.http.get<PaginatedResponse<TimeBlock>>(this.base, { params });
  }

  /** Helper para fluxos que precisam de todos os bloqueios (dashboard "Hoje"). */
  listAll() {
    return this.listPaginated({ page: 1, limit: 100 }).pipe(
      map((res) => res.data),
    );
  }

  /** Mantido por compatibilidade — equivalente a `listAll()`. */
  list() {
    return this.listAll();
  }

  create(dto: CreateTimeBlockRequest) {
    return this.http.post<TimeBlock>(this.base, dto);
  }

  remove(id: string) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
