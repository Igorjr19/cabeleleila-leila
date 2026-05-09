import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class BusinessHoursDto {
  @ApiProperty({ example: 1, description: '0=Domingo, 6=Sábado' })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  isOpen: boolean;

  @ApiProperty({ example: '09:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'Formato inválido. Use HH:mm' })
  openTime: string;

  @ApiProperty({ example: '18:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'Formato inválido. Use HH:mm' })
  closeTime: string;

  @ApiPropertyOptional({ example: '12:00', nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'Formato inválido. Use HH:mm' })
  lunchStart: string | null;

  @ApiPropertyOptional({ example: '13:00', nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'Formato inválido. Use HH:mm' })
  lunchEnd: string | null;
}

export class UpdateEstablishmentConfigDto {
  @ApiProperty({
    example: 2,
    description: 'Dias mínimos de antecedência para alteração online',
  })
  @IsInt()
  @Min(1)
  @Max(30)
  minDaysForOnlineUpdate: number;

  @ApiProperty({
    type: [BusinessHoursDto],
    description:
      'Horário de funcionamento — exatamente 7 entradas (uma por dia da semana)',
  })
  @IsArray()
  @ArrayMinSize(7)
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => BusinessHoursDto)
  businessHours: BusinessHoursDto[];
}
