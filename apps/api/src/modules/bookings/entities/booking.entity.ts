import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Establishment } from '../../establishment/entities/establishment.entity';
import { User } from '../../users/entities/user.entity';
import { BookingService } from './booking-service.entity';

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  FINISHED = 'FINISHED',
}

@Entity('bookings')
@Check(`"status" IN ('PENDING', 'CONFIRMED', 'CANCELLED', 'FINISHED')`)
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'establishment_id' })
  establishmentId: string;

  @Column({ name: 'customer_id' })
  customerId: string;

  @Column({ name: 'scheduled_at', type: 'timestamptz' })
  scheduledAt: Date;

  @Column({ type: 'text', default: 'PENDING' })
  status: BookingStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Establishment, (e) => e.bookings)
  @JoinColumn({ name: 'establishment_id' })
  establishment: Establishment;

  @ManyToOne(() => User, (u) => u.bookings)
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  @OneToMany(() => BookingService, (bs) => bs.booking)
  bookingServices: BookingService[];
}
