import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { Role, UserRole } from '../../modules/users/entities/user-role.entity';
import { User } from '../../modules/users/entities/user.entity';
import { defaultEstablishmentId } from './establishment.seed';

export async function seedAdmin(dataSource: DataSource): Promise<void> {
  const userRepo = dataSource.getRepository(User);
  const userRoleRepo = dataSource.getRepository(UserRole);

  const adminEmail = 'admin@leila.com';
  const existing = await userRepo.findOneBy({ email: adminEmail });

  if (existing) {
    console.log('✓ Usuário admin já existe. Pulando seed.');
    return;
  }

  const hashedPassword = await bcrypt.hash('admin123', 10);

  const admin = userRepo.create({
    name: 'Administradora',
    email: adminEmail,
    password: hashedPassword,
    phone: '(11) 99999-0000',
  });
  await userRepo.save(admin);

  const role = userRoleRepo.create({
    userId: admin.id,
    establishmentId: defaultEstablishmentId,
    role: Role.ADMIN,
  });
  await userRoleRepo.save(role);

  console.log('✓ Usuário admin criado: admin@leila.com / admin123');
}
