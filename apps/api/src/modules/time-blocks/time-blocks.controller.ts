import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
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
import { CreateTimeBlockDto } from './dto/create-time-block.dto';
import { TimeBlocksService } from './time-blocks.service';

@ApiTags('TimeBlocks')
@Controller('time-blocks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class TimeBlocksController {
  constructor(private readonly timeBlocksService: TimeBlocksService) {}

  @Post()
  @ApiOperation({ summary: 'Bloquear um intervalo de horário (Admin)' })
  @ApiResponse({ status: 201, description: 'Bloqueio criado' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateTimeBlockDto) {
    return this.timeBlocksService.create(user.establishmentId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar bloqueios futuros (Admin)' })
  list(@CurrentUser() user: JwtPayload) {
    return this.timeBlocksService.listUpcoming(user.establishmentId);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remover um bloqueio (Admin)' })
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<void> {
    await this.timeBlocksService.remove(user.establishmentId, id);
  }
}
