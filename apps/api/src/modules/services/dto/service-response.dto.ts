import { ApiProperty } from '@nestjs/swagger';
import { ServiceResponse } from '@cabeleleila/contracts';

export class ServiceResponseDto implements ServiceResponse {
  @ApiProperty()
  id: string;
  @ApiProperty()
  establishmentId: string;
  @ApiProperty()
  name: string;
  @ApiProperty()
  price: number;
  @ApiProperty()
  durationMinutes: number;
}
