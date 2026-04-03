import { UpdateServiceRequest } from '@cabeleleila/contracts';
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class UpdateServiceDto implements UpdateServiceRequest {
  @ApiProperty({
    example: 'Corte de cabelo premium',
    description: 'Novo nome do serviço',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: 100,
    description: 'Novo preço do serviço',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  price?: number;

  @ApiProperty({
    example: 90,
    description: 'Nova duração do serviço em minutos',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  durationMinutes?: number;
}
