import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTimeBlockDto {
  @ApiProperty({ description: 'Início do bloqueio em ISO 8601' })
  @IsISO8601()
  startsAt: string;

  @ApiProperty({ description: 'Fim do bloqueio em ISO 8601' })
  @IsISO8601()
  endsAt: string;

  @ApiPropertyOptional({ description: 'Motivo opcional', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
