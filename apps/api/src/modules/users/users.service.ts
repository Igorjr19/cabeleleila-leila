import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role, UserRole } from './entities/user-role.entity';
import { User } from './entities/user.entity';

interface CreateUserData {
  name: string;
  email: string;
  password: string;
}

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
}
