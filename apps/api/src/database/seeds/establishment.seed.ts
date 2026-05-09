import { DEFAULT_ESTABLISHMENT_CONFIG } from '@cabeleleila/contracts';
import { DataSource } from 'typeorm';
import { Establishment } from '../../modules/establishment/entities/establishment.entity';

export const defaultEstablishmentId = '550e8400-e29b-41d4-a716-446655440000';

export async function seedEstablishment(
  dataSource: DataSource,
): Promise<string> {
  const establishmentRepository = dataSource.getRepository(Establishment);

  const existingEstablishment = await establishmentRepository.findOne({
    where: { id: defaultEstablishmentId },
  });

  if (existingEstablishment) {
    console.log('✓ Estabelecimento padrão já existe. Pulando seed.');
    return existingEstablishment.id;
  }

  const establishment = establishmentRepository.create({
    id: defaultEstablishmentId,
    name: 'Salão de Beleza da Leila',
    cnpj: '00.000.000/0001-00',
    config: DEFAULT_ESTABLISHMENT_CONFIG,
  });

  await establishmentRepository.save(establishment);
  console.log(
    '✓ Estabelecimento padrão "Salão de Beleza da Leila" criado com sucesso!',
  );
  return establishment.id;
}
