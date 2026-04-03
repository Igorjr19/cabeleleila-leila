import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Booking } from '../../bookings/entities/booking.entity';
import { Service } from '../../services/entities/service.entity';
import { UserRole } from '../../users/entities/user-role.entity';

export interface BusinessHours {
  day_of_week: number;
  open_time: string;
  close_time: string;
  lunch_start: string | null;
  lunch_end: string | null;
}

export interface EstablishmentConfig {
  min_days_for_online_update: number;
  business_hours: BusinessHours[];
}

@Entity('establishments')
export class Establishment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 255, unique: true })
  cnpj: string;

  @Column({ type: 'jsonb', nullable: true })
  config: EstablishmentConfig | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => UserRole, (ur) => ur.establishment)
  userRoles: UserRole[];

  @OneToMany(() => Service, (s) => s.establishment)
  services: Service[];

  @OneToMany(() => Booking, (b) => b.establishment)
  bookings: Booking[];
}
