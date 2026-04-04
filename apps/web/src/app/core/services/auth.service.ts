import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  UserProfile,
} from '@cabeleleila/contracts';
import { Role } from '@cabeleleila/contracts';
import { environment } from '../../../environments/environment';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = environment.apiUrl;

  readonly token = signal<string | null>(null);
  readonly currentUser = signal<UserProfile | null>(null);

  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly isAdmin = computed(() => this.currentUser()?.role === Role.ADMIN);

  restoreSession(): void {
    const token = localStorage.getItem(TOKEN_KEY);
    const userRaw = localStorage.getItem(USER_KEY);
    if (token && userRaw) {
      try {
        this.token.set(token);
        this.currentUser.set(JSON.parse(userRaw) as UserProfile);
      } catch {
        this.clearStorage();
      }
    }
  }

  login(email: string, password: string) {
    const body: LoginRequest = {
      email,
      password,
      establishmentId: environment.establishmentId,
    };
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/auth/login`, body)
      .pipe(tap((res) => this.saveSession(res)));
  }

  register(name: string, email: string, phone: string, password: string) {
    const body: RegisterRequest = {
      name,
      email,
      phone,
      password,
      establishmentId: environment.establishmentId,
    };
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/auth/register`, body)
      .pipe(tap((res) => this.saveSession(res)));
  }

  logout(): void {
    this.clearStorage();
    this.token.set(null);
    this.currentUser.set(null);
    this.router.navigate(['/auth/login']);
  }

  private saveSession(res: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, res.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    this.token.set(res.accessToken);
    this.currentUser.set(res.user);
  }

  private clearStorage(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}
