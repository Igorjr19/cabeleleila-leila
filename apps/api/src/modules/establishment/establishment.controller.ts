import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { Role } from '../users/entities/user-role.entity';
import { UpdateEstablishmentConfigDto } from './dto/update-establishment-config.dto';
import { EstablishmentService } from './establishment.service';

@ApiTags('Establishment')
@Controller('establishment')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EstablishmentController {
  constructor(private readonly establishmentService: EstablishmentService) {}

  @Get('config')
  @ApiOperation({ summary: 'Obter configuração do estabelecimento' })
  @ApiResponse({ status: 200, description: 'Configuração atual' })
  getConfig(@CurrentUser() user: JwtPayload) {
    return this.establishmentService.getConfig(user.establishmentId);
  }

  @Patch('config')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Atualizar configuração do estabelecimento (Admin)',
  })
  @ApiResponse({ status: 200, description: 'Configuração atualizada' })
  updateConfig(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateEstablishmentConfigDto,
  ) {
    return this.establishmentService.updateConfig(user.establishmentId, dto);
  }
}
