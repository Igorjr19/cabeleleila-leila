import { AuthResponse, Role, UserProfile } from '@cabeleleila/contracts';
import { ApiProperty } from '@nestjs/swagger';

export class UserProfileDto implements UserProfile {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Maria Silva' })
  name: string;

  @ApiProperty({ example: 'maria@email.com' })
  email: string;

  @ApiProperty({ example: 'CUSTOMER', enum: ['ADMIN', 'CUSTOMER', 'EMPLOYEE'] })
  role: Role;

  @ApiProperty({ example: 'uuid-do-estabelecimento' })
  establishmentId: string;
}

export class AuthResponseDto implements AuthResponse {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @ApiProperty({ type: UserProfileDto })
  user: UserProfileDto;
}
