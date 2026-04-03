import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';

export class CreateServiceDto {
  @ApiProperty({
    example: 'Corte de cabelo',
    description: 'Nome do serviço',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 80.5,
    description: 'Preço do serviço em reais',
  })
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiProperty({
    example: 60,
    description: 'Duração do serviço em minutos',
  })
  @IsNumber()
  @IsPositive()
  durationMinutes: number;
}
