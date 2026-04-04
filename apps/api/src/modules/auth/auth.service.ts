import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '../users/entities/user-role.entity';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(
    name: string,
    email: string,
    phone: string,
    password: string,
    establishmentId: string,
  ) {
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new BadRequestException('Usuário com este email já existe');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.usersService.create({
      name,
      email,
      phone,
      password: hashedPassword,
    });

    const userRole = await this.usersService.createRole(
      user.id,
      establishmentId,
      Role.CUSTOMER,
    );

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      establishmentId,
      role: userRole.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: userRole.role,
        establishmentId,
      },
    };
  }

  async login(email: string, password: string, establishmentId: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const userRole = await this.usersService.findRoleByUserAndEstablishment(
      user.id,
      establishmentId,
    );

    if (!userRole) {
      throw new UnauthorizedException(
        'Usuário não possui acesso a este estabelecimento',
      );
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      establishmentId,
      role: userRole.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: userRole.role,
        establishmentId,
      },
    };
  }
}
