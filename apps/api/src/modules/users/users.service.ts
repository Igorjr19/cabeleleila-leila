import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role, UserRole } from './entities/user-role.entity';
import { User } from './entities/user.entity';
import { CreateUserData } from './interfaces/create-user-data.interface';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOneBy({ email });
  }

  findById(id: string): Promise<User | null> {
    return this.userRepo.findOneBy({ id });
  }

  create(data: CreateUserData): Promise<User> {
    const user = this.userRepo.create(data);
    return this.userRepo.save(user);
  }

  async updateProfile(
    userId: string,
    name?: string,
    phone?: string,
  ): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new BadRequestException('Usuário não encontrado');
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;

    return this.userRepo.save(user);
  }

  findRoleByUserAndEstablishment(
    userId: string,
    establishmentId: string,
  ): Promise<UserRole | null> {
    return this.userRoleRepo.findOneBy({ userId, establishmentId });
  }

  createRole(
    userId: string,
    establishmentId: string,
    role: Role,
  ): Promise<UserRole> {
    const userRole = this.userRoleRepo.create({
      userId,
      establishmentId,
      role,
    });
    return this.userRoleRepo.save(userRole);
  }

  async listCustomersWithStats(
    establishmentId: string,
  ): Promise<CustomerWithStats[]> {
    const rows: RawCustomerStatsRow[] = await this.userRoleRepo
      .createQueryBuilder('ur')
      .innerJoin('users', 'u', 'u.id = ur.user_id')
      .leftJoin(
        'bookings',
        'b',
        'b.customer_id = u.id AND b.establishment_id = ur.establishment_id',
      )
      .leftJoin('booking_services', 'bs', 'bs.booking_id = b.id')
      .select('u.id', 'id')
      .addSelect('u.name', 'name')
      .addSelect('u.email', 'email')
      .addSelect('u.phone', 'phone')
      .addSelect(
        `COUNT(DISTINCT CASE WHEN b.status != 'CANCELLED' THEN b.id END)`,
        'totalBookings',
      )
      .addSelect(
        `MAX(CASE WHEN b.status != 'CANCELLED' THEN b.scheduled_at END)`,
        'lastBookingAt',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN b.status = 'FINISHED' AND bs.status != 'DECLINED' THEN bs.price_at_booking ELSE 0 END), 0)`,
        'totalSpent',
      )
      .where('ur.establishment_id = :est', { est: establishmentId })
      .andWhere('ur.role = :role', { role: Role.CUSTOMER })
      .groupBy('u.id, u.name, u.email, u.phone')
      .orderBy(`MAX(b.scheduled_at)`, 'DESC', 'NULLS LAST')
      .getRawMany();

    return rows.map((r) => {
      const total = parseInt(r.totalBookings ?? '0', 10);
      const spent = parseFloat(r.totalSpent ?? '0');
      return {
        id: r.id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        totalBookings: total,
        lastBookingAt: r.lastBookingAt
          ? new Date(r.lastBookingAt).toISOString()
          : null,
        totalSpent: spent,
        averageTicket: total > 0 ? spent / total : 0,
      };
    });
  }
}

interface RawCustomerStatsRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  totalBookings: string;
  lastBookingAt: string | Date | null;
  totalSpent: string;
}

export interface CustomerWithStats {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  totalBookings: number;
  lastBookingAt: string | null;
  totalSpent: number;
  averageTicket: number;
}
