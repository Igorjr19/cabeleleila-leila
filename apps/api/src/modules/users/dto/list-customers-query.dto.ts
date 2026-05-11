import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination.dto';

export class ListCustomersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description:
      'Busca por nome, e-mail ou telefone (parcial, case-insensitive).',
  })
  @IsOptional()
  @IsString()
  q?: string;
}
