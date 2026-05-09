import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EstablishmentConfig } from '@cabeleleila/contracts';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class EstablishmentApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/establishment`;

  getConfig() {
    return this.http.get<EstablishmentConfig>(`${this.base}/config`);
  }

  updateConfig(dto: EstablishmentConfig) {
    return this.http.patch<EstablishmentConfig>(`${this.base}/config`, dto);
  }
}
