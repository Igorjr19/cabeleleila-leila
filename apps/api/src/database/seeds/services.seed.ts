import { DataSource } from 'typeorm';
import { Service } from '../../modules/services/entities/service.entity';

export async function seedServices(dataSource: DataSource) {
  const serviceRepository = dataSource.getRepository(Service);

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
      description:
        'Corte tradicional com lavagem e finalização. Atendemos cabelos curtos, médios e longos.',
    },
    {
      establishmentId,
      name: 'Corte Premium',
      price: 120.0,
      durationMinutes: 90,
      description:
        'Corte personalizado com consultoria de visagismo, lavagem premium e finalização com produtos profissionais.',
    },
    {
      establishmentId,
      name: 'Escova',
      price: 60.0,
      durationMinutes: 45,
      description:
        'Modelagem e finalização com escova. Pode ser lisa, ondulada ou com volume.',
    },
    {
      establishmentId,
      name: 'Pintura de Cabelo',
      price: 150.0,
      durationMinutes: 120,
      description:
        'Coloração completa em fios virgens ou retoque. Inclui hidratação leve pós-coloração.',
    },
    {
      establishmentId,
      name: 'Luzes/Mechas',
      price: 180.0,
      durationMinutes: 150,
      description:
        'Mechas tradicionais ou luzes para iluminar o visual. Inclui matização e tratamento.',
    },
    {
      establishmentId,
      name: 'Hidratação',
      price: 50.0,
      durationMinutes: 30,
      description:
        'Hidratação profunda com máscara reparadora. Recomendada quinzenalmente.',
    },
    {
      establishmentId,
      name: 'Tratamento Capilar',
      price: 70.0,
      durationMinutes: 45,
      description:
        'Tratamento intensivo para cabelos danificados, com avaliação de fios.',
    },
    {
      establishmentId,
      name: 'Progressiva',
      price: 200.0,
      durationMinutes: 180,
      description:
        'Alisamento progressivo profissional. Reduz o volume e elimina o frizz por até 4 meses.',
    },
    // Combos com desconto
    {
      establishmentId,
      name: 'Combo Escova + Hidratação',
      price: 95.0,
      durationMinutes: 75,
      description:
        'Aproveite o desconto: escova completa com hidratação reparadora. Economize R$ 15 vs serviços avulsos.',
    },
    {
      establishmentId,
      name: 'Combo Corte + Hidratação',
      price: 115.0,
      durationMinutes: 90,
      description:
        'Corte tradicional + hidratação profunda com desconto. Economize R$ 15 vs serviços avulsos.',
    },
    {
      establishmentId,
      name: 'Dia da Noiva (Corte Premium + Escova + Hidratação)',
      price: 215.0,
      durationMinutes: 165,
      description:
        'Pacote especial: corte premium, escova de festa e hidratação. Para o seu grande dia. Economize R$ 15.',
    },
  ];

  const serviceEntities = serviceRepository.create(services);
  await serviceRepository.save(serviceEntities);

  console.log(`✓ ${services.length} serviços criados com sucesso!`);
}
