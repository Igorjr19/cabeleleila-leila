import { Role } from './common';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  establishmentId: string;
}

export interface AuthResponse {
  accessToken: string;
  user: UserProfile;
}

export interface LoginRequest {
  email: string;
  password: string;
  establishmentId: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  establishmentId: string;
}
