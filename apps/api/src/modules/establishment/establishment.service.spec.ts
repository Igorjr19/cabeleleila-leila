import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  Establishment,
  EstablishmentConfig,
} from './entities/establishment.entity';
import { EstablishmentService } from './establishment.service';

const DEFAULT_CONFIG: EstablishmentConfig = {
  min_days_for_online_update: 2,
  business_hours: Array.from({ length: 7 }).map((_, i) => ({
    day_of_week: i,
    open_time: '08:00',
    close_time: '18:00',
    lunch_start: '12:00',
    lunch_end: '13:00',
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

      expect(config.min_days_for_online_update).toBe(2);
      expect(config.business_hours).toHaveLength(7);
      config.business_hours.forEach((h) => {
        expect(h.open_time).toBe('08:00');
        expect(h.close_time).toBe('18:00');
        expect(h.lunch_start).toBe('12:00');
        expect(h.lunch_end).toBe('13:00');
      });
    });

    it('retorna config salva quando não é null', async () => {
      const customConfig: EstablishmentConfig = {
        min_days_for_online_update: 3,
        business_hours: [
          {
            day_of_week: 1,
            open_time: '09:00',
            close_time: '17:00',
            lunch_start: '12:00',
            lunch_end: '13:00',
          },
        ],
      };
      mockRepo.findOneBy.mockResolvedValue(
        makeEstablishment({ config: customConfig }),
      );

      const config = await service.getConfig(EST_ID);

      expect(config.min_days_for_online_update).toBe(3);
      expect(config.business_hours[0].open_time).toBe('09:00');
    });

    it('defaults têm day_of_week de 0 a 6', async () => {
      mockRepo.findOneBy.mockResolvedValue(makeEstablishment({ config: null }));

      const config = await service.getConfig(EST_ID);

      const days = config.business_hours.map((h) => h.day_of_week);
      expect(days).toEqual([0, 1, 2, 3, 4, 5, 6]);
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

    it('persiste e retorna o estabelecimento com nova config', async () => {
      const est = makeEstablishment({ config: null });
      mockRepo.findOneBy.mockResolvedValue(est);
      mockRepo.save.mockResolvedValue({ ...est, config: DEFAULT_CONFIG });

      const result = await service.updateConfig(EST_ID, DEFAULT_CONFIG);

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ config: DEFAULT_CONFIG }),
      );
      expect(result.config).toEqual(DEFAULT_CONFIG);
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
