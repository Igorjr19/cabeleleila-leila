import { CreateBookingRequest } from '@cabeleleila/contracts';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDateString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateBookingDto implements CreateBookingRequest {
  @ApiProperty({
    example: ['uuid-service-1', 'uuid-service-2'],
    description: 'Array de IDs dos serviços a serem agendados',
  })
  @IsArray()
  @IsNotEmpty()
  @IsUUID('4', { each: true })
  serviceIds: string[];

  @ApiProperty({
    example: '2026-04-15T14:00:00Z',
    description: 'Data e hora do agendamento em ISO 8601',
  })
  @IsDateString()
  scheduledAt: string;
}
