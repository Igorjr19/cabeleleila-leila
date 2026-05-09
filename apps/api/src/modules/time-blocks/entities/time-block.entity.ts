import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Establishment } from '../../establishment/entities/establishment.entity';

@Entity('time_blocks')
@Check(`"ends_at" > "starts_at"`)
export class TimeBlock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'establishment_id' })
  establishmentId: string;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt: Date;

  @Column({ name: 'ends_at', type: 'timestamptz' })
  endsAt: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Establishment)
  @JoinColumn({ name: 'establishment_id' })
  establishment: Establishment;
}
