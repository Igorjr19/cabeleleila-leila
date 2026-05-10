import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { LessThan, Repository } from 'typeorm';
import { Role } from '../users/entities/user-role.entity';
import { UsersService } from '../users/users.service';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRepository(PasswordResetToken)
    private readonly resetTokenRepo: Repository<PasswordResetToken>,
  ) {}

  /**
   * Cria um token de reset para o e-mail informado. Sempre retorna sucesso (mesmo se
   * o e-mail não existir) para não vazar informação. Em produção, o token seria
   * enviado por e-mail; aqui ele é retornado para o frontend exibir o link.
   *
   * NOTA: este é um fallback simplificado para o teste técnico — em produção,
   * o token nunca deveria ser retornado pela API, apenas enviado por canal externo.
   */
  async requestPasswordReset(
    email: string,
  ): Promise<{ token: string | null; expiresAt: string | null }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Resposta neutra — não revela se o e-mail existe
      return { token: null, expiresAt: null };
    }

    // Limpa tokens expirados ou usados deste usuário
    await this.resetTokenRepo.delete({
      userId: user.id,
      usedAt: undefined,
      expiresAt: LessThan(new Date()),
    });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min

    const entity = this.resetTokenRepo.create({
      userId: user.id,
      token: rawToken,
      expiresAt,
    });
    await this.resetTokenRepo.save(entity);

    return { token: rawToken, expiresAt: expiresAt.toISOString() };
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    if (!token || newPassword.length < 6) {
      throw new BadRequestException(
        'Senha precisa ter pelo menos 6 caracteres.',
      );
    }

    const record = await this.resetTokenRepo.findOne({
      where: { token },
    });
    if (!record) {
      throw new NotFoundException('Token de redefinição inválido.');
    }
    if (record.usedAt) {
      throw new BadRequestException('Este link já foi utilizado.');
    }
    if (record.expiresAt < new Date()) {
      throw new BadRequestException('Este link expirou. Solicite um novo.');
    }

    const user = await this.usersService.findById(record.userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(user.id, hashed);

    record.usedAt = new Date();
    await this.resetTokenRepo.save(record);
  }

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
