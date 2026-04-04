import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { Role } from '../users/entities/user-role.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt');

const EST_ID = '550e8400-e29b-41d4-a716-446655440000';

const mockUser = {
  id: 'user-uuid',
  name: 'Maria Silva',
  email: 'maria@test.com',
  password: 'hashed_password',
};

const mockUserRole = {
  id: 'role-uuid',
  userId: mockUser.id,
  establishmentId: EST_ID,
  role: Role.CUSTOMER,
};

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    createRole: jest.fn(),
    findRoleByUserAndEstablishment: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('jwt.token.here'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ── register() ─────────────────────────────────────────────────────────────

  describe('register()', () => {
    beforeEach(() => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(mockUser);
      mockUsersService.createRole.mockResolvedValue(mockUserRole);
    });

    it('lança BadRequestException quando email já existe', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.register('Maria', 'maria@test.com', 'senha123', EST_ID),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.register('Maria', 'maria@test.com', 'senha123', EST_ID),
      ).rejects.toThrow('Usuário com este email já existe');
    });

    it('faz hash da senha antes de salvar', async () => {
      await service.register('Maria', 'maria@test.com', 'senha123', EST_ID);

      expect(bcrypt.hash).toHaveBeenCalledWith('senha123', 10);
      expect(mockUsersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ password: 'hashed_password' }),
      );
    });

    it('cria a role CUSTOMER para o novo usuário', async () => {
      await service.register('Maria', 'maria@test.com', 'senha123', EST_ID);

      expect(mockUsersService.createRole).toHaveBeenCalledWith(
        mockUser.id,
        EST_ID,
        Role.CUSTOMER,
      );
    });

    it('retorna accessToken e dados do usuário ao registrar com sucesso', async () => {
      const result = await service.register(
        'Maria',
        'maria@test.com',
        'senha123',
        EST_ID,
      );

      expect(result).toMatchObject({
        accessToken: 'jwt.token.here',
        user: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          role: Role.CUSTOMER,
          establishmentId: EST_ID,
        },
      });
    });

    it('assina o JWT com o payload correto', async () => {
      await service.register('Maria', 'maria@test.com', 'senha123', EST_ID);

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: mockUser.id,
          email: mockUser.email,
          establishmentId: EST_ID,
          role: Role.CUSTOMER,
        }),
      );
    });
  });

  // ── login() ─────────────────────────────────────────────────────────────────

  describe('login()', () => {
    beforeEach(() => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockUsersService.findRoleByUserAndEstablishment.mockResolvedValue(
        mockUserRole,
      );
    });

    it('lança UnauthorizedException quando usuário não existe', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login('naoexiste@test.com', 'senha123', EST_ID),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lança UnauthorizedException quando senha está incorreta', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login('maria@test.com', 'senha_errada', EST_ID),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lança UnauthorizedException quando usuário não tem acesso ao estabelecimento', async () => {
      mockUsersService.findRoleByUserAndEstablishment.mockResolvedValue(null);

      await expect(
        service.login('maria@test.com', 'senha123', 'outro-est-id'),
      ).rejects.toThrow('Usuário não possui acesso a este estabelecimento');
    });

    it('retorna accessToken e dados do usuário ao logar com sucesso', async () => {
      const result = await service.login('maria@test.com', 'senha123', EST_ID);

      expect(result).toMatchObject({
        accessToken: 'jwt.token.here',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          role: Role.CUSTOMER,
          establishmentId: EST_ID,
        },
      });
    });

    it('verifica a senha contra o hash armazenado', async () => {
      await service.login('maria@test.com', 'senha123', EST_ID);

      expect(bcrypt.compare).toHaveBeenCalledWith(
        'senha123',
        mockUser.password,
      );
    });

    it('assina o JWT com role do usuário no estabelecimento', async () => {
      const adminRole = { ...mockUserRole, role: Role.ADMIN };
      mockUsersService.findRoleByUserAndEstablishment.mockResolvedValue(
        adminRole,
      );

      await service.login('maria@test.com', 'senha123', EST_ID);

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ role: Role.ADMIN }),
      );
    });
  });
});
