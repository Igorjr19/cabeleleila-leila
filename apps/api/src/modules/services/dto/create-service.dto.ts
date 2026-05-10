import { CreateServiceRequest } from '@cabeleleila/contracts';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateServiceDto implements CreateServiceRequest {
  @ApiProperty({ example: 'Corte de cabelo' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 80.5 })
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiProperty({ example: 60 })
  @IsNumber()
  @IsPositive()
  durationMinutes: number;

  @ApiPropertyOptional({
    example:
      'Corte tradicional masculino ou feminino com finalização. Lavagem inclusa.',
    description: 'Descrição opcional exibida ao cliente',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;
}
