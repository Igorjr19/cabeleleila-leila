import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Establishment,
  EstablishmentConfig,
} from './entities/establishment.entity';

@Injectable()
export class EstablishmentService {
  constructor(
    @InjectRepository(Establishment)
    private readonly establishmentRepo: Repository<Establishment>,
  ) {}

  async create(name: string, cnpj: string): Promise<Establishment> {
    const existing = await this.establishmentRepo.findOneBy({ cnpj });
    if (existing) {
      throw new BadRequestException('CNPJ já cadastrado');
    }

    const establishment = this.establishmentRepo.create({ name, cnpj });
    return this.establishmentRepo.save(establishment);
  }

  async findAll(): Promise<Establishment[]> {
    return this.establishmentRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Establishment | null> {
    return this.establishmentRepo.findOneBy({ id });
  }

  async update(id: string, name?: string): Promise<Establishment> {
    const establishment = await this.findById(id);
    if (!establishment) {
      throw new BadRequestException('Estabelecimento não encontrado');
    }

    if (name) {
      establishment.name = name;
    }

    return this.establishmentRepo.save(establishment);
  }

  async remove(id: string): Promise<void> {
    const establishment = await this.findById(id);
    if (!establishment) {
      throw new BadRequestException('Estabelecimento não encontrado');
    }

    await this.establishmentRepo.remove(establishment);
  }

  async getConfig(id: string): Promise<EstablishmentConfig> {
    const establishment = await this.findById(id);
    if (!establishment) {
      throw new NotFoundException('Estabelecimento não encontrado');
    }
    if (!establishment.config) {
      return {
        min_days_for_online_update: 2,
        business_hours: Array.from({ length: 7 }).map((_, i) => ({
          day_of_week: i,
          open_time: '08:00',
          close_time: '18:00',
          lunch_start: '12:00',
          lunch_end: '13:00',
        })),
      };
    }
    return establishment.config;
  }

  async updateConfig(
    id: string,
    config: EstablishmentConfig,
  ): Promise<Establishment> {
    const establishment = await this.findById(id);
    if (!establishment) {
      throw new NotFoundException('Estabelecimento não encontrado');
    }
    establishment.config = config;
    return this.establishmentRepo.save(establishment);
  }
}
