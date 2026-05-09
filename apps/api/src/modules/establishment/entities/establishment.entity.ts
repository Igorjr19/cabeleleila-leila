import { BusinessHours, EstablishmentConfig } from '@cabeleleila/contracts';
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

export type { BusinessHours, EstablishmentConfig };

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
