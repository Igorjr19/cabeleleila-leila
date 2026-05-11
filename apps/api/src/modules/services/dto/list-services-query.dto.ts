import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination.dto';

export class ListServicesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description:
      'Obrigatório quando a requisição é anônima (fluxo público de cadastro).',
  })
  @IsOptional()
  @IsUUID()
  establishmentId?: string;
}
