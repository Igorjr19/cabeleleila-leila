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

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await this.userRepo.update({ id: userId }, { password: hashedPassword });
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
    // Use a CTE to pre-aggregate per-booking metrics so customer-level averages
    // don't get inflated by the booking_services join cardinality.
    const rows: RawCustomerStatsRow[] = await this.userRoleRepo.query(
      `
      WITH booking_metrics AS (
        SELECT
          b.id              AS booking_id,
          b.customer_id     AS customer_id,
          b.establishment_id AS establishment_id,
          b.status          AS status,
          b.scheduled_at    AS scheduled_at,
          COUNT(*) FILTER (WHERE bs.status != 'DECLINED')::int AS service_count,
          COALESCE(
            SUM(s.duration_minutes) FILTER (WHERE bs.status != 'DECLINED'),
            0
          )::int AS duration_total,
          COALESCE(
            SUM(bs.price_at_booking) FILTER (WHERE bs.status != 'DECLINED'),
            0
          )::numeric AS price_total
        FROM bookings b
        LEFT JOIN booking_services bs ON bs.booking_id = b.id
        LEFT JOIN services s ON s.id = bs.service_id
        GROUP BY b.id
      )
      SELECT
        u.id    AS id,
        u.name  AS name,
        u.email AS email,
        u.phone AS phone,
        COALESCE(
          COUNT(bm.booking_id) FILTER (WHERE bm.status != 'CANCELLED'),
          0
        )::int AS "totalBookings",
        MAX(bm.scheduled_at) FILTER (WHERE bm.status != 'CANCELLED') AS "lastBookingAt",
        COALESCE(
          SUM(bm.price_total) FILTER (WHERE bm.status = 'FINISHED'),
          0
        )::numeric AS "totalSpent",
        COALESCE(
          AVG(bm.service_count) FILTER (WHERE bm.status != 'CANCELLED'),
          0
        )::numeric AS "avgServicesPerBooking",
        COALESCE(
          AVG(bm.duration_total) FILTER (WHERE bm.status != 'CANCELLED'),
          0
        )::numeric AS "avgDurationMinutes"
      FROM users u
      INNER JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN booking_metrics bm
        ON bm.customer_id = u.id
        AND bm.establishment_id = ur.establishment_id
      WHERE ur.establishment_id = $1 AND ur.role = $2
      GROUP BY u.id, u.name, u.email, u.phone
      ORDER BY MAX(bm.scheduled_at) DESC NULLS LAST
      `,
      [establishmentId, Role.CUSTOMER],
    );

    return rows.map((r) => {
      const total = parseInt(String(r.totalBookings ?? '0'), 10);
      const spent = parseFloat(String(r.totalSpent ?? '0'));
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
        averageServicesPerBooking: parseFloat(
          String(r.avgServicesPerBooking ?? '0'),
        ),
        averageDurationMinutes: parseFloat(String(r.avgDurationMinutes ?? '0')),
      };
    });
  }
}

interface RawCustomerStatsRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  totalBookings: string | number;
  lastBookingAt: string | Date | null;
  totalSpent: string | number;
  avgServicesPerBooking: string | number;
  avgDurationMinutes: string | number;
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
  averageServicesPerBooking: number;
  averageDurationMinutes: number;
}
