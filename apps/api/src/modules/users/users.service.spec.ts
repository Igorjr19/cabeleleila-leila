import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Role, UserRole } from './entities/user-role.entity';
import { User } from './entities/user.entity';
import { CreateUserData } from './interfaces/create-user-data.interface';
import { UsersService } from './users.service';

const USER_ID = 'user-uuid';
const EST_ID = 'est-uuid';

const makeUser = (overrides: Partial<User> = {}): User =>
  ({
    id: USER_ID,
    name: 'João',
    email: 'joao@test.com',
    passwordHash: 'hash',
    phone: null,
    bookings: [],
    userRoles: [],
    ...overrides,
  }) as User;

const makeRole = (overrides: Partial<UserRole> = {}): UserRole =>
  ({
    id: 'role-uuid',
    userId: USER_ID,
    establishmentId: EST_ID,
    role: Role.CUSTOMER,
    ...overrides,
  }) as UserRole;

describe('UsersService', () => {
  let service: UsersService;

  const mockUserRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOneBy: jest.fn(),
  };

  const mockUserRoleRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOneBy: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: getRepositoryToken(UserRole), useValue: mockUserRoleRepo },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  // ── findByEmail() ──────────────────────────────────────────────────────────

  describe('findByEmail()', () => {
    it('retorna usuário quando email existe', async () => {
      const user = makeUser();
      mockUserRepo.findOneBy.mockResolvedValue(user);

      const result = await service.findByEmail('joao@test.com');

      expect(result).toBe(user);
      expect(mockUserRepo.findOneBy).toHaveBeenCalledWith({
        email: 'joao@test.com',
      });
    });

    it('retorna null quando email não existe', async () => {
      mockUserRepo.findOneBy.mockResolvedValue(null);

      const result = await service.findByEmail('naoexiste@test.com');

      expect(result).toBeNull();
    });
  });

  // ── findById() ─────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('retorna usuário quando ID existe', async () => {
      const user = makeUser();
      mockUserRepo.findOneBy.mockResolvedValue(user);

      const result = await service.findById(USER_ID);

      expect(result).toBe(user);
      expect(mockUserRepo.findOneBy).toHaveBeenCalledWith({ id: USER_ID });
    });

    it('retorna null para ID inexistente', async () => {
      mockUserRepo.findOneBy.mockResolvedValue(null);

      const result = await service.findById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  // ── create() ───────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('cria e persiste usuário com os dados informados', async () => {
      const data = {
        name: 'Maria',
        email: 'maria@test.com',
        password: 'mypassword',
      } satisfies CreateUserData;

      const user = makeUser({ ...data });
      mockUserRepo.create.mockReturnValue(user);
      mockUserRepo.save.mockResolvedValue(user);

      const result = await service.create(data);

      expect(mockUserRepo.create).toHaveBeenCalledWith(data);
      expect(mockUserRepo.save).toHaveBeenCalledWith(user);
      expect(result.email).toBe(data.email);
    });
  });

  // ── updateProfile() ────────────────────────────────────────────────────────

  describe('updateProfile()', () => {
    it('lança BadRequestException quando usuário não existe', async () => {
      mockUserRepo.findOneBy.mockResolvedValue(null);

      await expect(service.updateProfile(USER_ID, 'Novo Nome')).rejects.toThrow(
        BadRequestException,
      );

      await expect(service.updateProfile(USER_ID, 'Novo Nome')).rejects.toThrow(
        'Usuário não encontrado',
      );
    });

    it('atualiza nome corretamente', async () => {
      const user = makeUser();
      mockUserRepo.findOneBy.mockResolvedValue(user);
      mockUserRepo.save.mockResolvedValue({ ...user, name: 'Novo Nome' });

      const result = await service.updateProfile(USER_ID, 'Novo Nome');

      expect(result.name).toBe('Novo Nome');
      expect(mockUserRepo.save).toHaveBeenCalled();
    });

    it('atualiza telefone corretamente', async () => {
      const user = makeUser();
      mockUserRepo.findOneBy.mockResolvedValue(user);
      mockUserRepo.save.mockResolvedValue({
        ...user,
        phone: '(11) 99999-9999',
      });

      const result = await service.updateProfile(
        USER_ID,
        undefined,
        '(11) 99999-9999',
      );

      expect(result.phone).toBe('(11) 99999-9999');
    });

    it('atualiza nome e telefone simultaneamente', async () => {
      const user = makeUser();
      mockUserRepo.findOneBy.mockResolvedValue(user);
      mockUserRepo.save.mockResolvedValue({
        ...user,
        name: 'Maria',
        phone: '(21) 98888-8888',
      });

      const result = await service.updateProfile(
        USER_ID,
        'Maria',
        '(21) 98888-8888',
      );

      expect(result.name).toBe('Maria');
      expect(result.phone).toBe('(21) 98888-8888');
    });

    it('não altera campos quando name e phone são omitidos', async () => {
      const user = makeUser({ name: 'João', phone: '(11) 11111-1111' });
      mockUserRepo.findOneBy.mockResolvedValue(user);
      mockUserRepo.save.mockResolvedValue(user);

      await service.updateProfile(USER_ID);

      expect(mockUserRepo.save).toHaveBeenCalledWith(user);
    });
  });

  // ── findRoleByUserAndEstablishment() ───────────────────────────────────────

  describe('findRoleByUserAndEstablishment()', () => {
    it('retorna a role quando user+establishment existem', async () => {
      const role = makeRole();
      mockUserRoleRepo.findOneBy.mockResolvedValue(role);

      const result = await service.findRoleByUserAndEstablishment(
        USER_ID,
        EST_ID,
      );

      expect(result).toBe(role);
      expect(mockUserRoleRepo.findOneBy).toHaveBeenCalledWith({
        userId: USER_ID,
        establishmentId: EST_ID,
      });
    });

    it('retorna null quando não há role para o par user+establishment', async () => {
      mockUserRoleRepo.findOneBy.mockResolvedValue(null);

      const result = await service.findRoleByUserAndEstablishment(
        USER_ID,
        'outro-est',
      );

      expect(result).toBeNull();
    });
  });

  // ── createRole() ───────────────────────────────────────────────────────────

  describe('createRole()', () => {
    it('cria e persiste role com os dados corretos', async () => {
      const role = makeRole();
      mockUserRoleRepo.create.mockReturnValue(role);
      mockUserRoleRepo.save.mockResolvedValue(role);

      const result = await service.createRole(USER_ID, EST_ID, Role.CUSTOMER);

      expect(mockUserRoleRepo.create).toHaveBeenCalledWith({
        userId: USER_ID,
        establishmentId: EST_ID,
        role: Role.CUSTOMER,
      });
      expect(result.role).toBe(Role.CUSTOMER);
    });

    it('cria role ADMIN corretamente', async () => {
      const adminRole = makeRole({ role: Role.ADMIN });
      mockUserRoleRepo.create.mockReturnValue(adminRole);
      mockUserRoleRepo.save.mockResolvedValue(adminRole);

      const result = await service.createRole(USER_ID, EST_ID, Role.ADMIN);

      expect(result.role).toBe(Role.ADMIN);
    });
  });
});
