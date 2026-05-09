import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
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

  list() {
    return this.http.get<TimeBlock[]>(this.base);
  }

  create(dto: CreateTimeBlockRequest) {
    return this.http.post<TimeBlock>(this.base, dto);
  }

  remove(id: string) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
