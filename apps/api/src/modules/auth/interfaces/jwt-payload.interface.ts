import { Role } from '../../users/entities/user-role.entity';

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  establishmentId: string;
  role: Role;
}
