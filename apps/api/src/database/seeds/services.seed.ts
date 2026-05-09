import { DataSource } from 'typeorm';
import { Service } from '../../modules/services/entities/service.entity';

export async function seedServices(dataSource: DataSource) {
  const serviceRepository = dataSource.getRepository(Service);

  // UUID padrão para o estabelecimento
  const establishmentId = '550e8400-e29b-41d4-a716-446655440000';

  const existingServices = await serviceRepository.find({
    where: { establishmentId },
  });

  if (existingServices.length > 0) {
    console.log('✓ Serviços já foram criados. Pulando seed.');
    return;
  }

  const services = [
    {
      establishmentId,
      name: 'Corte de Cabelo',
      price: 80.0,
      durationMinutes: 60,
    },
    {
      establishmentId,
      name: 'Corte Premium',
      price: 120.0,
      durationMinutes: 90,
    },
    {
      establishmentId,
      name: 'Escova',
      price: 60.0,
      durationMinutes: 45,
    },
    {
      establishmentId,
      name: 'Pintura de Cabelo',
      price: 150.0,
      durationMinutes: 120,
    },
    {
      establishmentId,
      name: 'Luzes/Mechas',
      price: 180.0,
      durationMinutes: 150,
    },
    {
      establishmentId,
      name: 'Hidratação',
      price: 50.0,
      durationMinutes: 30,
    },
    {
      establishmentId,
      name: 'Tratamento Capilar',
      price: 70.0,
      durationMinutes: 45,
    },
    {
      establishmentId,
      name: 'Progressiva',
      price: 200.0,
      durationMinutes: 180,
    },
    {
      establishmentId,
      name: 'Combo Escova + Hidratação',
      price: 95.0,
      durationMinutes: 75,
    },
    {
      establishmentId,
      name: 'Combo Corte + Hidratação',
      price: 115.0,
      durationMinutes: 90,
    },
    {
      establishmentId,
      name: 'Dia da Noiva (Corte Premium + Escova + Hidratação)',
      price: 215.0,
      durationMinutes: 165,
    },
  ];

  const serviceEntities = serviceRepository.create(services);
  await serviceRepository.save(serviceEntities);

  console.log(`✓ ${services.length} serviços criados com sucesso!`);
}
