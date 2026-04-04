import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
}
