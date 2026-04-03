import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsPhoneNumber, IsString } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({
    example: 'Maria Silva Santos',
    description: 'Nome completo do usuário',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: '(11) 99999-8888',
    description:
      'Telefone para contato (necessário para cancelamentos com menos de 48h)',
    required: false,
  })
  @IsOptional()
  @IsPhoneNumber('BR')
  phone?: string;
}
