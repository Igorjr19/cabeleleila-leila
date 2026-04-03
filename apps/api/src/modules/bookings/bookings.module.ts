import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstablishmentModule } from '../establishment/establishment.module';
import { ServicesModule } from '../services/services.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { BookingService } from './entities/booking-service.entity';
import { Booking } from './entities/booking.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, BookingService]),
    ServicesModule,
    EstablishmentModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
