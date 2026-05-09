export interface ServiceResponse {
  id: string;
  establishmentId: string;
  name: string;
  price: number;
  durationMinutes: number;
  active: boolean;
}

export interface CreateServiceRequest {
  name: string;
  price: number;
  durationMinutes: number;
}

export interface UpdateServiceRequest {
  name?: string;
  price?: number;
  durationMinutes?: number;
}
