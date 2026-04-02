import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Establishment } from '../../establishment/entities/establishment.entity';
import { User } from './user.entity';

export enum Role {
  ADMIN = 'ADMIN',
  CUSTOMER = 'CUSTOMER',
  EMPLOYEE = 'EMPLOYEE',
}

@Entity('user_roles')
@Unique(['userId', 'establishmentId'])
@Check(`"role" IN ('ADMIN', 'CUSTOMER', 'EMPLOYEE')`)
export class UserRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'establishment_id' })
  establishmentId: string;

  @Column({ type: 'text' })
  role: Role;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => User, (u) => u.roles)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Establishment, (e) => e.userRoles)
  @JoinColumn({ name: 'establishment_id' })
  establishment: Establishment;
}
