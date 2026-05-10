import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Service } from './entities/service.entity';
import { ServicesService } from './services.service';
import { UpdateServiceDto } from './dto/update-service.dto';

const EST_ID = 'est-uuid';
const SVC_ID = 'svc-uuid';

const makeService = (overrides: Partial<Service> = {}): Service =>
  ({
    id: SVC_ID,
    establishmentId: EST_ID,
    name: 'Corte de Cabelo',
    price: 80,
    durationMinutes: 60,
    bookingServices: [],
    ...overrides,
  }) as Service;

describe('ServicesService', () => {
  let service: ServicesService;

  const mockRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findBy: jest.fn(),
    findOneBy: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        { provide: getRepositoryToken(Service), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<ServicesService>(ServicesService);
  });

  // ── create() ───────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('cria e retorna o serviço com os campos corretos', async () => {
      const svc = makeService();
      mockRepo.create.mockReturnValue(svc);
      mockRepo.save.mockResolvedValue(svc);

      const result = await service.create(EST_ID, {
        name: 'Corte de Cabelo',
        price: 80,
        durationMinutes: 60,
      });

      expect(mockRepo.create).toHaveBeenCalledWith({
        establishmentId: EST_ID,
        name: 'Corte de Cabelo',
        price: 80,
        durationMinutes: 60,
        description: null,
      });
      expect(result.name).toBe('Corte de Cabelo');
      expect(result.price).toBe(80);
    });
  });

  // ── findByIdsAndEstablishment() ────────────────────────────────────────────

  describe('findByIdsAndEstablishment()', () => {
    it('lança BadRequestException quando nenhum ID é encontrado', async () => {
      mockRepo.findBy.mockResolvedValue([]);

      await expect(
        service.findByIdsAndEstablishment(['id-1', 'id-2'], EST_ID),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.findByIdsAndEstablishment(['id-1', 'id-2'], EST_ID),
      ).rejects.toThrow('não foram encontrados');
    });

    it('lança BadRequestException quando apenas parte dos IDs é encontrada', async () => {
      mockRepo.findBy.mockResolvedValue([makeService({ id: 'id-1' })]);

      await expect(
        service.findByIdsAndEstablishment(['id-1', 'id-2'], EST_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('retorna todos os serviços quando todos os IDs existem no estabelecimento', async () => {
      const svcs = [
        makeService({ id: 'id-1' }),
        makeService({ id: 'id-2', name: 'Escova' }),
      ];
      mockRepo.findBy.mockResolvedValue(svcs);

      const result = await service.findByIdsAndEstablishment(
        ['id-1', 'id-2'],
        EST_ID,
      );

      expect(result).toHaveLength(2);
    });

    it('não retorna serviços de outro estabelecimento', async () => {
      // findBy recebe establishmentId como filtro — se o repo retornar vazio, lança
      mockRepo.findBy.mockResolvedValue([]);

      await expect(
        service.findByIdsAndEstablishment(['id-1'], 'outro-est'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── update() ───────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('lança NotFoundException quando serviço não existe no estabelecimento', async () => {
      mockRepo.findOneBy.mockResolvedValue(null);

      await expect(
        service.update(SVC_ID, EST_ID, {
          name: 'Novo Nome',
        } as UpdateServiceDto),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.update(SVC_ID, EST_ID, {
          name: 'Novo Nome',
        } as UpdateServiceDto),
      ).rejects.toThrow('Serviço não encontrado');
    });

    it('atualiza campos parcialmente (name apenas)', async () => {
      const svc = makeService();
      mockRepo.findOneBy.mockResolvedValue(svc);
      mockRepo.save.mockResolvedValue({ ...svc, name: 'Corte Premium' });

      const result = await service.update(SVC_ID, EST_ID, {
        name: 'Corte Premium',
      } as UpdateServiceDto);

      expect(result.name).toBe('Corte Premium');
      expect(result.price).toBe(80); // inalterado
    });

    it('atualiza preço e duração', async () => {
      const svc = makeService();
      mockRepo.findOneBy.mockResolvedValue(svc);
      mockRepo.save.mockResolvedValue({
        ...svc,
        price: 100,
        durationMinutes: 90,
      });

      const result = await service.update(SVC_ID, EST_ID, {
        price: 100,
        durationMinutes: 90,
      } as UpdateServiceDto);

      expect(result.price).toBe(100);
      expect(result.durationMinutes).toBe(90);
    });

    it('não altera serviços de outro estabelecimento', async () => {
      mockRepo.findOneBy.mockResolvedValue(null); // scope por establishmentId no findOneBy

      await expect(
        service.update(SVC_ID, 'outro-est', { name: 'X' } as UpdateServiceDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── remove() ───────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('lança NotFoundException quando serviço não existe', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(SVC_ID, EST_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('faz soft-delete (active=false) quando há agendamentos vinculados', async () => {
      const svc = makeService({
        active: true,
        bookingServices: [{ id: 'bs-1' } as any],
      });
      mockRepo.findOne.mockResolvedValue(svc);
      mockRepo.save.mockResolvedValue({ ...svc, active: false });

      await expect(service.remove(SVC_ID, EST_ID)).resolves.not.toThrow();

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ active: false }),
      );
      expect(mockRepo.remove).not.toHaveBeenCalled();
    });

    it('remove com sucesso quando não há agendamentos', async () => {
      const svc = makeService({ bookingServices: [] });
      mockRepo.findOne.mockResolvedValue(svc);
      mockRepo.remove.mockResolvedValue(undefined);

      await expect(service.remove(SVC_ID, EST_ID)).resolves.not.toThrow();
      expect(mockRepo.remove).toHaveBeenCalledWith(svc);
    });

    it('busca serviço com relation bookingServices para validar', async () => {
      const svc = makeService({ bookingServices: [] });
      mockRepo.findOne.mockResolvedValue(svc);
      mockRepo.remove.mockResolvedValue(undefined);

      await service.remove(SVC_ID, EST_ID);

      expect(mockRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: ['bookingServices'],
        }),
      );
    });
  });

  // ── findByEstablishment() ──────────────────────────────────────────────────

  describe('findByEstablishment()', () => {
    it('retorna serviços ordenados por nome', async () => {
      const svcs = [
        makeService({ name: 'Escova' }),
        makeService({ name: 'Corte' }),
      ];
      mockRepo.find.mockResolvedValue(svcs);

      const result = await service.findByEstablishment(EST_ID);

      expect(result).toHaveLength(2);
      expect(mockRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { name: 'ASC' },
        }),
      );
    });

    it('retorna lista vazia quando não há serviços', async () => {
      mockRepo.find.mockResolvedValue([]);

      const result = await service.findByEstablishment(EST_ID);

      expect(result).toEqual([]);
    });
  });
});
