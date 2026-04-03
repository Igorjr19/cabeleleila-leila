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
    name: 'Cabeleleila Leila',
    cnpj: '00.000.000/0001-00',
    config: {
      min_days_for_online_update: 2,
      business_hours: [
        {
          day_of_week: 1,
          open_time: '09:00',
          close_time: '18:00',
          lunch_start: null,
          lunch_end: null,
        }, // Monday
        {
          day_of_week: 2,
          open_time: '09:00',
          close_time: '18:00',
          lunch_start: null,
          lunch_end: null,
        }, // Tuesday
        {
          day_of_week: 3,
          open_time: '09:00',
          close_time: '18:00',
          lunch_start: null,
          lunch_end: null,
        }, // Wednesday
        {
          day_of_week: 4,
          open_time: '09:00',
          close_time: '18:00',
          lunch_start: null,
          lunch_end: null,
        }, // Thursday
        {
          day_of_week: 5,
          open_time: '09:00',
          close_time: '18:00',
          lunch_start: null,
          lunch_end: null,
        }, // Friday
        {
          day_of_week: 6,
          open_time: '09:00',
          close_time: '14:00',
          lunch_start: null,
          lunch_end: null,
        }, // Saturday
      ],
    },
  });

  await establishmentRepository.save(establishment);
  console.log(
    '✓ Estabelecimento padrão "Cabeleleila Leila" criado com sucesso!',
  );
  return establishment.id;
}
