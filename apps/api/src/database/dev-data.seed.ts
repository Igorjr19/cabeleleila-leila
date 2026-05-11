/**
 * Standalone seed for **development/test data** — popula o banco com volume
 * realista de clientes brasileiros, agendamentos distribuídos no histórico e
 * futuro, e bloqueios de horário variados. Pensado para demo/apresentação,
 * usando @faker-js/faker em locale pt-BR.
 *
 * Run with:  pnpm --filter api seed:dev
 *
 * Idempotente: limpa dados anteriores marcados como dev antes de gerar.
 *
 * Inclui também 5 clientes "showcase" com credenciais fixas para login
 * (`maria@dev.com`, `joao@dev.com`, etc. / senha `123456`) e 4 agendamentos
 * curados para HOJE — cobre a aba `/admin/dashboard` (Hoje) sem depender
 * de aleatoriedade.
 */
import { fakerPT_BR as faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';
import { In } from 'typeorm';
import {
  BookingService as BookingEntityService,
  BookingServiceStatus,
} from '../modules/bookings/entities/booking-service.entity';
import {
  Booking,
  BookingStatus,
} from '../modules/bookings/entities/booking.entity';
import { Establishment } from '../modules/establishment/entities/establishment.entity';
import { Service } from '../modules/services/entities/service.entity';
import { TimeBlock } from '../modules/time-blocks/entities/time-block.entity';
import { Role, UserRole } from '../modules/users/entities/user-role.entity';
import { User } from '../modules/users/entities/user.entity';
import { AppDataSource } from './data-source';
import { defaultEstablishmentId } from './seeds/establishment.seed';

// ── Configuração ─────────────────────────────────────────────────────────────

const NUM_CUSTOMERS = 150;
const NUM_BOOKINGS_TARGET = 1200;
const NUM_TIME_BLOCKS = 25;
const DAYS_BACK = 180;
const DAYS_FORWARD = 30;
const DEFAULT_PASSWORD = '123456';

interface FixedCustomer {
  name: string;
  email: string;
  phone: string;
  password: string;
}

const SHOWCASE_CUSTOMERS: FixedCustomer[] = [
  {
    name: 'Maria Oliveira',
    email: 'maria@dev.com',
    phone: '(11) 99100-0001',
    password: DEFAULT_PASSWORD,
  },
  {
    name: 'João Pereira',
    email: 'joao@dev.com',
    phone: '(11) 99100-0002',
    password: DEFAULT_PASSWORD,
  },
  {
    name: 'Ana Souza',
    email: 'ana@dev.com',
    phone: '(11) 99100-0003',
    password: DEFAULT_PASSWORD,
  },
  {
    name: 'Pedro Lima',
    email: 'pedro@dev.com',
    phone: '(11) 99100-0004',
    password: DEFAULT_PASSWORD,
  },
  {
    name: 'Carla Mendes',
    email: 'carla@dev.com',
    phone: '(11) 99100-0005',
    password: DEFAULT_PASSWORD,
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickOne<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length > 0) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

/** Brazilian phone with mask `(NN) NNNNN-NNNN`. */
function brazilianPhone(): string {
  const ddd = randInt(11, 99);
  const part1 = String(randInt(90000, 99999));
  const part2 = String(randInt(1000, 9999));
  return `(${ddd}) ${part1}-${part2}`;
}

interface DayHours {
  isOpen: boolean;
  openMin: number;
  closeMin: number;
  lunchStartMin: number | null;
  lunchEndMin: number | null;
}

// Default business hours matching the seed config
const DAY_HOURS_BY_DOW: Record<number, DayHours> = {
  0: {
    isOpen: false,
    openMin: 540,
    closeMin: 1080,
    lunchStartMin: null,
    lunchEndMin: null,
  },
  1: {
    isOpen: true,
    openMin: 540,
    closeMin: 1080,
    lunchStartMin: 720,
    lunchEndMin: 780,
  },
  2: {
    isOpen: true,
    openMin: 540,
    closeMin: 1080,
    lunchStartMin: 720,
    lunchEndMin: 780,
  },
  3: {
    isOpen: true,
    openMin: 540,
    closeMin: 1080,
    lunchStartMin: 720,
    lunchEndMin: 780,
  },
  4: {
    isOpen: true,
    openMin: 540,
    closeMin: 1080,
    lunchStartMin: 720,
    lunchEndMin: 780,
  },
  5: {
    isOpen: true,
    openMin: 540,
    closeMin: 1080,
    lunchStartMin: 720,
    lunchEndMin: 780,
  },
  6: {
    isOpen: true,
    openMin: 540,
    closeMin: 840,
    lunchStartMin: null,
    lunchEndMin: null,
  },
};

interface BookingDraft {
  customerId: string;
  scheduledAt: Date;
  bookingStatus: BookingStatus;
  services: Array<{ service: Service; status: BookingServiceStatus }>;
  durationMinutes: number;
}

/**
 * Em-memória, mantém intervalos já agendados por dia (yyyy-mm-dd) para evitar
 * choque de horário ao gerar bookings.
 */
class DayOccupancy {
  private intervalsByDay = new Map<string, Array<[number, number]>>();

  /** Tenta reservar [startMin, endMin) no dia; retorna true se inseriu. */
  tryReserve(date: Date, startMin: number, endMin: number): boolean {
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const taken = this.intervalsByDay.get(key) ?? [];
    for (const [s, e] of taken) {
      if (startMin < e && endMin > s) return false;
    }
    taken.push([startMin, endMin]);
    this.intervalsByDay.set(key, taken);
    return true;
  }
}

// ── Limpeza ──────────────────────────────────────────────────────────────────

async function clearPreviousDevData(): Promise<void> {
  const userRepo = AppDataSource.getRepository(User);
  const bookingRepo = AppDataSource.getRepository(Booking);
  const timeBlockRepo = AppDataSource.getRepository(TimeBlock);

  const devUsers = await userRepo
    .createQueryBuilder('u')
    .where('u.email LIKE :p1 OR u.email LIKE :p2', {
      p1: '%@dev.com',
      p2: '%@faker.dev',
    })
    .getMany();

  if (devUsers.length > 0) {
    const ids = devUsers.map((u) => u.id);

    const bookingIds = (
      await bookingRepo.find({ where: { customerId: In(ids) } })
    ).map((b) => b.id);
    if (bookingIds.length > 0) {
      await AppDataSource.query(
        `DELETE FROM booking_services WHERE booking_id = ANY($1::uuid[])`,
        [bookingIds],
      );
      await bookingRepo.delete({ id: In(bookingIds) });
    }
    await AppDataSource.query(
      `DELETE FROM user_roles WHERE user_id = ANY($1::uuid[])`,
      [ids],
    );
    await userRepo.delete({ id: In(ids) });
    console.log(`✓ Removidos ${devUsers.length} usuários dev anteriores`);
  }

  const devBlocks = await timeBlockRepo
    .createQueryBuilder('tb')
    .where('tb.reason LIKE :p', { p: '[dev]%' })
    .getMany();
  if (devBlocks.length > 0) {
    await timeBlockRepo.delete({ id: In(devBlocks.map((b) => b.id)) });
    console.log(`✓ Removidos ${devBlocks.length} bloqueios dev anteriores`);
  }
}

// ── Entidades base ───────────────────────────────────────────────────────────

async function ensureEstablishment(): Promise<Establishment> {
  const est = await AppDataSource.getRepository(Establishment).findOneBy({
    id: defaultEstablishmentId,
  });
  if (!est) {
    throw new Error(
      'Estabelecimento padrão não existe. Suba a API ao menos uma vez antes de rodar o seed dev.',
    );
  }
  return est;
}

async function ensureServices(establishmentId: string): Promise<Service[]> {
  const services = await AppDataSource.getRepository(Service).find({
    where: { establishmentId },
  });
  if (services.length === 0) {
    throw new Error('Nenhum serviço base encontrado — suba a API antes.');
  }
  return services;
}

// ── Customers ────────────────────────────────────────────────────────────────

async function createCustomers(
  establishmentId: string,
): Promise<{ users: User[]; showcaseByEmail: Map<string, User> }> {
  const userRepo = AppDataSource.getRepository(User);
  const userRoleRepo = AppDataSource.getRepository(UserRole);
  const hashed = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const users: User[] = [];
  const showcaseByEmail = new Map<string, User>();

  // Showcase customers (credenciais fixas)
  for (const c of SHOWCASE_CUSTOMERS) {
    const u = await userRepo.save(
      userRepo.create({
        name: c.name,
        email: c.email,
        phone: c.phone,
        password: hashed,
      }),
    );
    await userRoleRepo.save(
      userRoleRepo.create({
        userId: u.id,
        establishmentId,
        role: Role.CUSTOMER,
      }),
    );
    users.push(u);
    showcaseByEmail.set(c.email, u);
  }

  // Random faker customers
  const fakerCount = NUM_CUSTOMERS - SHOWCASE_CUSTOMERS.length;
  const usedEmails = new Set(SHOWCASE_CUSTOMERS.map((c) => c.email));

  for (let i = 0; i < fakerCount; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const name = `${firstName} ${lastName}`;
    // emails únicos com sufixo @faker.dev para limpeza fácil
    let email = `${firstName.toLowerCase().replace(/[^a-z]/g, '')}.${lastName.toLowerCase().replace(/[^a-z]/g, '')}${i}@faker.dev`;
    if (usedEmails.has(email)) email = `customer${i}@faker.dev`;
    usedEmails.add(email);
    const u = await userRepo.save(
      userRepo.create({
        name,
        email,
        phone: brazilianPhone(),
        password: hashed,
      }),
    );
    await userRoleRepo.save(
      userRoleRepo.create({
        userId: u.id,
        establishmentId,
        role: Role.CUSTOMER,
      }),
    );
    users.push(u);
  }

  console.log(`✓ ${users.length} clientes criados`);
  return { users, showcaseByEmail };
}

// ── Booking generation ───────────────────────────────────────────────────────

function pickServicesForBooking(catalog: Service[]): Service[] {
  // 70% 1 service, 25% 2 services, 5% 3 services
  const r = Math.random();
  const n = r < 0.7 ? 1 : r < 0.95 ? 2 : 3;
  return pickN(
    catalog.filter((s) => s.active),
    n,
  );
}

function statusForOffsetDays(daysFromNow: number): BookingStatus {
  if (daysFromNow < -1) {
    // Past: mostly FINISHED, some CANCELLED
    return Math.random() < 0.85
      ? BookingStatus.FINISHED
      : BookingStatus.CANCELLED;
  }
  if (daysFromNow < 1) {
    // Today: confirmed (already happened in the morning) or pending
    return Math.random() < 0.6
      ? BookingStatus.CONFIRMED
      : BookingStatus.PENDING;
  }
  if (daysFromNow < 4) {
    // Near future: pending / confirmed mix
    const r = Math.random();
    if (r < 0.55) return BookingStatus.CONFIRMED;
    if (r < 0.92) return BookingStatus.PENDING;
    return BookingStatus.CANCELLED;
  }
  // Far future
  const r = Math.random();
  if (r < 0.4) return BookingStatus.CONFIRMED;
  if (r < 0.95) return BookingStatus.PENDING;
  return BookingStatus.CANCELLED;
}

function serviceStatusesForBooking(
  bookingStatus: BookingStatus,
  serviceCount: number,
): BookingServiceStatus[] {
  if (bookingStatus === BookingStatus.PENDING) {
    return Array.from(
      { length: serviceCount },
      () => BookingServiceStatus.PENDING,
    );
  }
  if (bookingStatus === BookingStatus.CANCELLED) {
    return Array.from(
      { length: serviceCount },
      () => BookingServiceStatus.PENDING,
    );
  }
  // CONFIRMED / FINISHED: maioria CONFIRMED, ~10% chance de algum DECLINED
  return Array.from({ length: serviceCount }, () =>
    Math.random() < 0.1
      ? BookingServiceStatus.DECLINED
      : BookingServiceStatus.CONFIRMED,
  );
}

/** Tenta gerar um booking válido (horário comercial + sem conflito). */
function tryBuildBooking(
  customerId: string,
  catalog: Service[],
  occupancy: DayOccupancy,
  daysFromNow: number,
): BookingDraft | null {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  const dow = date.getDay();
  const hours = DAY_HOURS_BY_DOW[dow];
  if (!hours.isOpen) return null;

  const services = pickServicesForBooking(catalog);
  if (services.length === 0) return null;
  const duration = services.reduce((sum, s) => sum + s.durationMinutes, 0);

  // Pick a 15-min aligned slot within open hours and that fits the duration
  const latestStart = hours.closeMin - duration;
  if (latestStart < hours.openMin) return null;

  // Try up to 8 random slots to avoid collisions
  for (let attempt = 0; attempt < 8; attempt++) {
    const slotsCount = Math.floor((latestStart - hours.openMin) / 15) + 1;
    const startMin =
      hours.openMin + Math.floor(Math.random() * slotsCount) * 15;
    const endMin = startMin + duration;

    // Avoid lunch overlap
    if (
      hours.lunchStartMin !== null &&
      hours.lunchEndMin !== null &&
      startMin < hours.lunchEndMin &&
      endMin > hours.lunchStartMin
    ) {
      continue;
    }

    if (!occupancy.tryReserve(date, startMin, endMin)) {
      continue;
    }

    const scheduled = new Date(date);
    scheduled.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);

    const bookingStatus = statusForOffsetDays(daysFromNow);
    const itemStatuses = serviceStatusesForBooking(
      bookingStatus,
      services.length,
    );

    return {
      customerId,
      scheduledAt: scheduled,
      bookingStatus,
      services: services.map((service, i) => ({
        service,
        status: itemStatuses[i],
      })),
      durationMinutes: duration,
    };
  }
  return null;
}

async function insertBookings(
  establishmentId: string,
  drafts: BookingDraft[],
): Promise<number> {
  if (drafts.length === 0) return 0;
  const bookingRepo = AppDataSource.getRepository(Booking);
  const bookingServiceRepo = AppDataSource.getRepository(BookingEntityService);

  // Batched inserts for speed
  const chunkSize = 100;
  let created = 0;
  for (let i = 0; i < drafts.length; i += chunkSize) {
    const chunk = drafts.slice(i, i + chunkSize);
    const bookingsToInsert = chunk.map((d) =>
      bookingRepo.create({
        establishmentId,
        customerId: d.customerId,
        scheduledAt: d.scheduledAt,
        status: d.bookingStatus,
      }),
    );
    const savedBookings = await bookingRepo.save(bookingsToInsert);

    const bookingServices: BookingEntityService[] = [];
    for (let j = 0; j < savedBookings.length; j++) {
      const booking = savedBookings[j];
      const draft = chunk[j];
      for (const item of draft.services) {
        bookingServices.push(
          bookingServiceRepo.create({
            bookingId: booking.id,
            serviceId: item.service.id,
            priceAtBooking: item.service.price,
            status: item.status,
          }),
        );
      }
    }
    await bookingServiceRepo.save(bookingServices);
    created += savedBookings.length;
  }
  return created;
}

async function createBookings(
  establishmentId: string,
  customers: User[],
  catalog: Service[],
): Promise<number> {
  const occupancy = new DayOccupancy();
  const drafts: BookingDraft[] = [];

  // 1) Curated "today" bookings to populate /admin/dashboard (Hoje) reliably
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayBookings: Array<{
    hour: number;
    minute: number;
    serviceNames: string[];
    bookingStatus: BookingStatus;
    itemStatus: BookingServiceStatus;
    customer: User;
  }> = [
    {
      hour: 9,
      minute: 0,
      serviceNames: ['Corte de Cabelo'],
      bookingStatus: BookingStatus.FINISHED,
      itemStatus: BookingServiceStatus.CONFIRMED,
      customer: customers[0],
    },
    {
      hour: 10,
      minute: 30,
      serviceNames: ['Combo Corte + Hidratação'],
      bookingStatus: BookingStatus.CONFIRMED,
      itemStatus: BookingServiceStatus.CONFIRMED,
      customer: customers[1],
    },
    {
      hour: 14,
      minute: 0,
      serviceNames: ['Hidratação'],
      bookingStatus: BookingStatus.CONFIRMED,
      itemStatus: BookingServiceStatus.CONFIRMED,
      customer: customers[4],
    },
    {
      hour: 15,
      minute: 30,
      serviceNames: ['Escova'],
      bookingStatus: BookingStatus.PENDING,
      itemStatus: BookingServiceStatus.PENDING,
      customer: customers[3],
    },
  ];

  for (const tb of todayBookings) {
    const services = tb.serviceNames
      .map((n) => catalog.find((s) => s.name === n))
      .filter((s): s is Service => !!s);
    if (services.length === 0) continue;
    const duration = services.reduce((sum, s) => sum + s.durationMinutes, 0);
    const startMin = tb.hour * 60 + tb.minute;
    if (!occupancy.tryReserve(today, startMin, startMin + duration)) continue;
    const scheduled = new Date(today);
    scheduled.setHours(tb.hour, tb.minute, 0, 0);
    drafts.push({
      customerId: tb.customer.id,
      scheduledAt: scheduled,
      bookingStatus: tb.bookingStatus,
      services: services.map((service) => ({ service, status: tb.itemStatus })),
      durationMinutes: duration,
    });
  }

  // 2) Random distribution across past + future
  let attempts = 0;
  while (
    drafts.length < NUM_BOOKINGS_TARGET &&
    attempts < NUM_BOOKINGS_TARGET * 5
  ) {
    attempts++;
    const customer = pickOne(customers);
    const daysFromNow = randInt(-DAYS_BACK, DAYS_FORWARD);
    const draft = tryBuildBooking(customer.id, catalog, occupancy, daysFromNow);
    if (draft) drafts.push(draft);
  }

  return insertBookings(establishmentId, drafts);
}

// ── Time Blocks ──────────────────────────────────────────────────────────────

async function createTimeBlocks(establishmentId: string): Promise<number> {
  const repo = AppDataSource.getRepository(TimeBlock);
  const blocks: TimeBlock[] = [];

  const reasons = [
    'Almoço estendido',
    'Reunião com fornecedor',
    'Médico',
    'Curso de visagismo',
    'Folga',
    'Manutenção do salão',
    'Compromisso pessoal',
  ];

  // Misturado: ~30% no passado (histórico), 70% no futuro
  for (let i = 0; i < NUM_TIME_BLOCKS; i++) {
    const past = Math.random() < 0.3;
    const days = past ? -randInt(1, DAYS_BACK) : randInt(1, DAYS_FORWARD);
    const date = new Date();
    date.setDate(date.getDate() + days);
    const dow = date.getDay();
    const hours = DAY_HOURS_BY_DOW[dow];
    if (!hours.isOpen) continue;

    const startHour = randInt(
      Math.floor(hours.openMin / 60),
      Math.floor(hours.closeMin / 60) - 2,
    );
    const startsAt = new Date(date);
    startsAt.setHours(startHour, 0, 0, 0);
    const duration = pickOne([60, 90, 120, 180]);
    const endsAt = new Date(startsAt.getTime() + duration * 60_000);

    blocks.push(
      repo.create({
        establishmentId,
        startsAt,
        endsAt,
        reason: `[dev] ${pickOne(reasons)}`,
      }),
    );
  }

  // Garante 1 bloqueio HOJE para a aba "Hoje" mostrar timeline rica
  const todayBlock = new Date();
  todayBlock.setHours(12, 0, 0, 0);
  const todayBlockEnd = new Date(todayBlock);
  todayBlockEnd.setHours(13, 30, 0, 0);
  blocks.push(
    repo.create({
      establishmentId,
      startsAt: todayBlock,
      endsAt: todayBlockEnd,
      reason: '[dev] Almoço estendido — reunião com fornecedor',
    }),
  );

  if (blocks.length > 0) {
    await repo.save(blocks);
  }
  return blocks.length;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function run(): Promise<void> {
  const startedAt = Date.now();
  console.log('🌱 Iniciando seed de dados de desenvolvimento (com faker)...\n');

  await AppDataSource.initialize();
  try {
    const est = await ensureEstablishment();
    const catalog = await ensureServices(est.id);
    await clearPreviousDevData();

    const { users: customers } = await createCustomers(est.id);
    const totalBookings = await createBookings(est.id, customers, catalog);
    console.log(`✓ ${totalBookings} agendamentos criados`);
    const totalBlocks = await createTimeBlocks(est.id);
    console.log(`✓ ${totalBlocks} bloqueios criados`);

    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log(`\n✅ Seed dev concluído em ${elapsed}s.\n`);

    console.log('Credenciais de teste fixas (todos com senha "123456"):');
    console.log('  Admin     → admin@leila.com / admin123');
    for (const c of SHOWCASE_CUSTOMERS) {
      console.log(`  Cliente   → ${c.email.padEnd(22)} / ${c.password}`);
    }
    console.log(
      `\n📦 ${NUM_CUSTOMERS - SHOWCASE_CUSTOMERS.length} clientes adicionais foram gerados com nomes/e-mails aleatórios (sufixo @faker.dev, senha "123456").`,
    );
  } finally {
    await AppDataSource.destroy();
  }
}

run().catch((err) => {
  console.error('\n❌ Falha no seed dev:', err);
  process.exit(1);
});
