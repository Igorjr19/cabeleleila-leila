export interface ServiceResponse {
  id: string;
  establishmentId: string;
  name: string;
  price: number;
  durationMinutes: number;
  active: boolean;
  description: string | null;
}

export interface CreateServiceRequest {
  name: string;
  price: number;
  durationMinutes: number;
  description?: string | null;
}

export interface UpdateServiceRequest {
  name?: string;
  price?: number;
  durationMinutes?: number;
  description?: string | null;
}
