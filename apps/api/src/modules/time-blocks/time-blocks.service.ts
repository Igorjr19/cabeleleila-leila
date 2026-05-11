import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTimeBlockDto } from './dto/create-time-block.dto';
import { TimeBlock } from './entities/time-block.entity';

@Injectable()
export class TimeBlocksService {
  constructor(
    @InjectRepository(TimeBlock)
    private readonly repo: Repository<TimeBlock>,
  ) {}

  async create(
    establishmentId: string,
    dto: CreateTimeBlockDto,
  ): Promise<TimeBlock> {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);

    if (endsAt <= startsAt) {
      throw new BadRequestException(
        'O fim do bloqueio deve ser depois do início.',
      );
    }

    const block = this.repo.create({
      establishmentId,
      startsAt,
      endsAt,
      reason: dto.reason ?? null,
    });
    return this.repo.save(block);
  }

  async listUpcoming(
    establishmentId: string,
    pagination?: { skip: number; limit: number },
  ): Promise<{ data: TimeBlock[]; total: number }> {
    const qb = this.repo
      .createQueryBuilder('tb')
      .where('tb.establishment_id = :est', { est: establishmentId })
      .andWhere('tb.ends_at > NOW()')
      .orderBy('tb.starts_at', 'ASC');

    const total = await qb.getCount();

    if (pagination) {
      qb.skip(pagination.skip).take(pagination.limit);
    }

    const data = await qb.getMany();
    return { data, total };
  }

  async findInRange(
    establishmentId: string,
    rangeStart: Date,
    rangeEnd: Date,
  ): Promise<TimeBlock[]> {
    // Find blocks that overlap [rangeStart, rangeEnd)
    return this.repo
      .createQueryBuilder('tb')
      .where('tb.establishment_id = :est', { est: establishmentId })
      .andWhere('tb.starts_at < :rangeEnd AND tb.ends_at > :rangeStart', {
        rangeStart: rangeStart.toISOString(),
        rangeEnd: rangeEnd.toISOString(),
      })
      .orderBy('tb.starts_at', 'ASC')
      .getMany();
  }

  async remove(establishmentId: string, id: string): Promise<void> {
    const block = await this.repo.findOneBy({ id, establishmentId });
    if (!block) {
      throw new NotFoundException('Bloqueio não encontrado.');
    }
    await this.repo.remove(block);
  }
}
