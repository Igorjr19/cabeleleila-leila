import { Request } from 'express';
import { Role } from '@cabeleleila/contracts';

export interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    name: string;
    establishmentId: string;
    role: Role;
  };
}
