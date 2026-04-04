import { UpdateBookingRequest } from '@cabeleleila/contracts';
import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class UpdateBookingDto implements UpdateBookingRequest {
  @ApiProperty({
    example: '2026-04-17T10:00:00-03:00',
    description: 'Nova data e hora do agendamento em ISO 8601',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiProperty({
    example: ['uuid-service-1'],
    description: 'Novos IDs de serviços (substitui todos os atuais)',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  serviceIds?: string[];
}
