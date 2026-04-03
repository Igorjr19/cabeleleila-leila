import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstablishmentController } from './establishment.controller';
import { Establishment } from './entities/establishment.entity';
import { EstablishmentService } from './establishment.service';

@Module({
  imports: [TypeOrmModule.forFeature([Establishment])],
  controllers: [EstablishmentController],
  providers: [EstablishmentService],
  exports: [EstablishmentService],
})
export class EstablishmentModule {}
