import { EstablishmentConfig } from '@cabeleleila/contracts';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Establishment } from './entities/establishment.entity';
import { EstablishmentService } from './establishment.service';

const DEFAULT_CONFIG: EstablishmentConfig = {
  minDaysForOnlineUpdate: 2,
  businessHours: Array.from({ length: 7 }).map((_, i) => ({
    dayOfWeek: i,
    isOpen: true,
    openTime: '08:00',
    closeTime: '18:00',
    lunchStart: '12:00',
    lunchEnd: '13:00',
  })),
};

const EST_ID = 'est-uuid';

const makeEstablishment = (
  overrides: Partial<Establishment> = {},
): Establishment =>
  ({
    id: EST_ID,
    name: 'Salão da Leila',
    cnpj: '12345678000100',
    config: DEFAULT_CONFIG,
    createdAt: new Date(),
    ...overrides,
  }) as Establishment;

describe('EstablishmentService', () => {
  let service: EstablishmentService;

  const mockRepo = {
    findOneBy: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EstablishmentService,
        { provide: getRepositoryToken(Establishment), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<EstablishmentService>(EstablishmentService);
  });

  // ── create() ───────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('lança BadRequestException quando CNPJ já cadastrado', async () => {
      mockRepo.findOneBy.mockResolvedValue(makeEstablishment());

      await expect(
        service.create('Outro Salão', '12345678000100'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.create('Outro Salão', '12345678000100'),
      ).rejects.toThrow('CNPJ já cadastrado');
    });

    it('cria e retorna o estabelecimento quando CNPJ é inédito', async () => {
      const newEst = makeEstablishment({ id: 'new-uuid' });
      mockRepo.findOneBy.mockResolvedValue(null);
      mockRepo.create.mockReturnValue(newEst);
      mockRepo.save.mockResolvedValue(newEst);

      const result = await service.create('Salão da Leila', '12345678000100');

      expect(mockRepo.create).toHaveBeenCalledWith({
        name: 'Salão da Leila',
        cnpj: '12345678000100',
      });
      expect(result.id).toBe('new-uuid');
    });
  });

  // ── getConfig() ────────────────────────────────────────────────────────────

  describe('getConfig()', () => {
    it('lança NotFoundException quando estabelecimento não existe', async () => {
      mockRepo.findOneBy.mockResolvedValue(null);

      await expect(service.getConfig(EST_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('retorna defaults quando config é null', async () => {
      mockRepo.findOneBy.mockResolvedValue(makeEstablishment({ config: null }));

      const config = await service.getConfig(EST_ID);

      expect(config.minDaysForOnlineUpdate).toBe(2);
      expect(config.businessHours).toHaveLength(7);
      const days = config.businessHours.map((h) => h.dayOfWeek);
      expect(days).toEqual([0, 1, 2, 3, 4, 5, 6]);
    });

    it('retorna config salva quando não é null', async () => {
      const customConfig: EstablishmentConfig = {
        minDaysForOnlineUpdate: 3,
        businessHours: [
          {
            dayOfWeek: 1,
            isOpen: true,
            openTime: '09:00',
            closeTime: '17:00',
            lunchStart: '12:00',
            lunchEnd: '13:00',
          },
        ],
      };
      mockRepo.findOneBy.mockResolvedValue(
        makeEstablishment({ config: customConfig }),
      );

      const config = await service.getConfig(EST_ID);

      expect(config.minDaysForOnlineUpdate).toBe(3);
      expect(config.businessHours[0].openTime).toBe('09:00');
    });
  });

  // ── updateConfig() ─────────────────────────────────────────────────────────

  describe('updateConfig()', () => {
    it('lança NotFoundException quando estabelecimento não existe', async () => {
      mockRepo.findOneBy.mockResolvedValue(null);

      await expect(
        service.updateConfig(EST_ID, DEFAULT_CONFIG),
      ).rejects.toThrow(NotFoundException);
    });

    it('persiste e retorna a nova config', async () => {
      const est = makeEstablishment({ config: null });
      mockRepo.findOneBy.mockResolvedValue(est);
      mockRepo.save.mockResolvedValue({ ...est, config: DEFAULT_CONFIG });

      const result = await service.updateConfig(EST_ID, DEFAULT_CONFIG);

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ config: DEFAULT_CONFIG }),
      );
      expect(result).toEqual(DEFAULT_CONFIG);
    });
  });

  // ── update() ───────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('lança BadRequestException quando não encontrado', async () => {
      mockRepo.findOneBy.mockResolvedValue(null);

      await expect(service.update(EST_ID, 'Novo Nome')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('atualiza o nome e salva', async () => {
      const est = makeEstablishment();
      mockRepo.findOneBy.mockResolvedValue(est);
      mockRepo.save.mockResolvedValue({ ...est, name: 'Novo Nome' });

      const result = await service.update(EST_ID, 'Novo Nome');

      expect(result.name).toBe('Novo Nome');
    });
  });

  // ── remove() ───────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('lança BadRequestException quando não encontrado', async () => {
      mockRepo.findOneBy.mockResolvedValue(null);

      await expect(service.remove(EST_ID)).rejects.toThrow(BadRequestException);
    });

    it('remove o estabelecimento quando existe', async () => {
      const est = makeEstablishment();
      mockRepo.findOneBy.mockResolvedValue(est);
      mockRepo.remove.mockResolvedValue(undefined);

      await expect(service.remove(EST_ID)).resolves.not.toThrow();
      expect(mockRepo.remove).toHaveBeenCalledWith(est);
    });
  });
});
