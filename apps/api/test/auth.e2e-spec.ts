import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */

/**
 * E2E: Auth endpoints
 *
 * Roda contra o banco de desenvolvimento real (sem banco isolado).
 * Usa emails únicos por execução para não colidir com dados existentes.
 */
const EST_ID = '550e8400-e29b-41d4-a716-446655440000';
const uniqueSuffix = () =>
  `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  const suffix = uniqueSuffix();
  const email = `test_${suffix}@e2e.com`;
  const password = 'senha123';
  const name = 'Teste E2E';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ── POST /auth/register ───────────────────────────────────────────────────

  describe('POST /auth/register', () => {
    it('201 — registra novo usuário e retorna accessToken + user', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name, email, password, establishmentId: EST_ID })
        .expect(201);

      expect(res.body).toMatchObject({
        accessToken: expect.any(String),
        user: {
          email,
          name,
          role: 'CUSTOMER',
          establishmentId: EST_ID,
          id: expect.any(String),
        },
      });
      expect(res.body.accessToken.split('.')).toHaveLength(3);
    });

    it('400 — rejeita email duplicado', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name, email, password, establishmentId: EST_ID })
        .expect(400);
    });

    it('400 — rejeita payload sem email', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name, password, establishmentId: EST_ID })
        .expect(400);
    });

    it('400 — rejeita senha menor que 6 caracteres', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name,
          email: `short_${suffix}@e2e.com`,
          password: '123',
          establishmentId: EST_ID,
        })
        .expect(400);
    });
  });

  // ── POST /auth/login ──────────────────────────────────────────────────────

  describe('POST /auth/login', () => {
    it('200 — loga com credenciais corretas e retorna JWT', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password, establishmentId: EST_ID })
        .expect(200);

      expect(res.body).toMatchObject({
        accessToken: expect.any(String),
        user: { email, role: 'CUSTOMER' },
      });
    });

    it('401 — rejeita senha incorreta', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'errada', establishmentId: EST_ID })
        .expect(401);
    });

    it('401 — rejeita usuário inexistente', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'naoexiste@nada.com',
          password,
          establishmentId: EST_ID,
        })
        .expect(401);
    });

    it('401 — rejeita establishmentId inválido', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email,
          password,
          establishmentId: '00000000-0000-0000-0000-000000000000',
        })
        .expect(401);
    });

    it('400 — rejeita payload sem establishmentId', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password })
        .expect(400);
    });
  });
});
