import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BookingService } from '../../bookings/entities/booking-service.entity';
import { Establishment } from '../../establishment/entities/establishment.entity';

@Entity('services')
export class Service {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'establishment_id' })
  establishmentId: string;

  @Column({ length: 255 })
  name: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: { to: (v: number) => v, from: (v: string) => parseFloat(v) },
  })
  price: number;

  @Column({ name: 'duration_minutes', type: 'int' })
  durationMinutes: number;

  @ManyToOne(() => Establishment, (e) => e.services)
  @JoinColumn({ name: 'establishment_id' })
  establishment: Establishment;

  @OneToMany(() => BookingService, (bs) => bs.service)
  bookingServices: BookingService[];
}
