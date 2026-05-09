import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UpdateServiceDto } from './dto/update-service.dto';
import { Service } from './entities/service.entity';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service)
    private readonly serviceRepo: Repository<Service>,
  ) {}

  async create(
    establishmentId: string,
    name: string,
    price: number,
    durationMinutes: number,
  ): Promise<Service> {
    const service = this.serviceRepo.create({
      establishmentId,
      name,
      price,
      durationMinutes,
    });
    return this.serviceRepo.save(service);
  }

  async findByEstablishment(
    establishmentId: string,
    includeInactive = false,
  ): Promise<Service[]> {
    return this.serviceRepo.find({
      where: includeInactive
        ? { establishmentId }
        : { establishmentId, active: true },
      order: { name: 'ASC' },
    });
  }

  async setActive(
    id: string,
    establishmentId: string,
    active: boolean,
  ): Promise<Service> {
    const service = await this.serviceRepo.findOneBy({ id, establishmentId });
    if (!service) {
      throw new NotFoundException('Serviço não encontrado');
    }
    service.active = active;
    return this.serviceRepo.save(service);
  }

  async findById(
    id: string,
    establishmentId?: string,
  ): Promise<Service | null> {
    if (establishmentId) {
      return this.serviceRepo.findOneBy({ id, establishmentId });
    }
    return this.serviceRepo.findOneBy({ id });
  }

  async findByIdsAndEstablishment(
    ids: string[],
    establishmentId: string,
  ): Promise<Service[]> {
    const services = await this.serviceRepo.findBy({
      id: In(ids),
      establishmentId,
    });
    if (services.length !== ids.length) {
      throw new BadRequestException(
        'Um ou mais serviços não foram encontrados ou não pertencem a este estabelecimento',
      );
    }
    return services;
  }

  async update(
    id: string,
    establishmentId: string,
    dto: UpdateServiceDto,
  ): Promise<Service> {
    const service = await this.serviceRepo.findOneBy({ id, establishmentId });
    if (!service) {
      throw new NotFoundException('Serviço não encontrado');
    }
    Object.assign(service, dto);
    return this.serviceRepo.save(service);
  }

  async remove(id: string, establishmentId: string): Promise<void> {
    const service = await this.serviceRepo.findOne({
      where: { id, establishmentId },
      relations: ['bookingServices'],
    });
    if (!service) {
      throw new NotFoundException('Serviço não encontrado');
    }
    if (service.bookingServices?.length > 0) {
      // Soft-delete: keep history intact, hide from customer catalog
      service.active = false;
      await this.serviceRepo.save(service);
      return;
    }
    await this.serviceRepo.remove(service);
  }
}
