import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class BusinessHoursDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(0)
  @Max(6)
  day_of_week: number;

  @ApiProperty({ example: '08:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'Formato inválido. Use HH:mm' })
  open_time: string;

  @ApiProperty({ example: '18:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'Formato inválido. Use HH:mm' })
  close_time: string;

  @ApiPropertyOptional({ example: '12:00' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'Formato inválido. Use HH:mm' })
  lunch_start: string | null;

  @ApiPropertyOptional({ example: '13:00' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'Formato inválido. Use HH:mm' })
  lunch_end: string | null;
}

export class UpdateEstablishmentConfigDto {
  @ApiProperty({
    example: 2,
    description: 'Dias mínimos de antecedência para alteração online',
  })
  @IsInt()
  @Min(1)
  @Max(30)
  min_days_for_online_update: number;

  @ApiProperty({ type: [BusinessHoursDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BusinessHoursDto)
  business_hours: BusinessHoursDto[];
}
