import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Service } from '../../services/entities/service.entity';
import { Booking } from './booking.entity';

@Entity('booking_services')
@Unique(['bookingId', 'serviceId'])
export class BookingService {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'booking_id' })
  bookingId: string;

  @Column({ name: 'service_id' })
  serviceId: string;

  @Column({
    name: 'price_at_booking',
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: { to: (v: number) => v, from: (v: string) => parseFloat(v) },
  })
  priceAtBooking: number;

  @ManyToOne(() => Booking, (b) => b.bookingServices)
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @ManyToOne(() => Service, (s) => s.bookingServices)
  @JoinColumn({ name: 'service_id' })
  service: Service;
}
