import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { AuthResponse, Role } from '@cabeleleila/contracts';
import { environment } from '../../../environments/environment';

const EST_ID = environment.establishmentId;

const mockCustomer: AuthResponse = {
  accessToken: 'jwt.token.customer',
  user: {
    id: 'user-1',
    name: 'João',
    email: 'joao@test.com',
    role: Role.CUSTOMER,
    establishmentId: EST_ID,
  },
};

const mockAdmin: AuthResponse = {
  accessToken: 'jwt.token.admin',
  user: {
    id: 'admin-1',
    name: 'Leila',
    email: 'leila@test.com',
    role: Role.ADMIN,
    establishmentId: EST_ID,
  },
};

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService, { provide: Router, useValue: routerSpy }],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);

    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  // ── Estado inicial ─────────────────────────────────────────────────────────

  describe('estado inicial', () => {
    it('token começa como null', () => {
      expect(service.token()).toBeNull();
    });

    it('currentUser começa como null', () => {
      expect(service.currentUser()).toBeNull();
    });

    it('isAuthenticated é false quando não há usuário', () => {
      expect(service.isAuthenticated()).toBe(false);
    });

    it('isAdmin é false quando não há usuário', () => {
      expect(service.isAdmin()).toBe(false);
    });
  });

  // ── restoreSession() ───────────────────────────────────────────────────────

  describe('restoreSession()', () => {
    it('restaura token e usuário do localStorage', () => {
      localStorage.setItem('auth_token', mockCustomer.accessToken);
      localStorage.setItem('auth_user', JSON.stringify(mockCustomer.user));

      service.restoreSession();

      expect(service.token()).toBe(mockCustomer.accessToken);
      expect(service.currentUser()).toEqual(mockCustomer.user);
      expect(service.isAuthenticated()).toBe(true);
    });

    it('não restaura se não há dados no localStorage', () => {
      service.restoreSession();

      expect(service.token()).toBeNull();
      expect(service.currentUser()).toBeNull();
    });

    it('não lança exceção com JSON inválido no localStorage', () => {
      localStorage.setItem('auth_token', 'some-token');
      localStorage.setItem('auth_user', 'invalid-json{{{');

      expect(() => service.restoreSession()).not.toThrow();
      expect(service.currentUser()).toBeNull();
    });

    it('limpa localStorage quando o JSON é inválido', () => {
      localStorage.setItem('auth_token', 'some-token');
      localStorage.setItem('auth_user', 'invalid-json');

      service.restoreSession();

      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(localStorage.getItem('auth_user')).toBeNull();
    });
  });

  // ── login() ────────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('envia POST para /auth/login com establishmentId do environment', () => {
      service.login('joao@test.com', 'senha123').subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        email: 'joao@test.com',
        password: 'senha123',
        establishmentId: EST_ID,
      });
      req.flush(mockCustomer);
    });

    it('salva token e usuário em localStorage após login', () => {
      service.login('joao@test.com', 'senha123').subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush(mockCustomer);

      expect(localStorage.getItem('auth_token')).toBe(mockCustomer.accessToken);
      expect(JSON.parse(localStorage.getItem('auth_user')!)).toEqual(
        mockCustomer.user,
      );
    });

    it('atualiza signals após login', () => {
      service.login('joao@test.com', 'senha123').subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush(mockCustomer);

      expect(service.token()).toBe(mockCustomer.accessToken);
      expect(service.currentUser()).toEqual(mockCustomer.user);
      expect(service.isAuthenticated()).toBe(true);
    });

    it('isAdmin é false para role CUSTOMER', () => {
      service.login('joao@test.com', 'senha123').subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush(mockCustomer);

      expect(service.isAdmin()).toBe(false);
    });

    it('isAdmin é true para role ADMIN', () => {
      service.login('leila@test.com', 'admin123').subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush(mockAdmin);

      expect(service.isAdmin()).toBe(true);
    });
  });

  // ── register() ────────────────────────────────────────────────────────────

  describe('register()', () => {
    it('envia POST para /auth/register com establishmentId', () => {
      service
        .register('João', 'joao@test.com', '11999999999', 'senha123')
        .subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/register`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        name: 'João',
        email: 'joao@test.com',
        phone: '11999999999',
        password: 'senha123',
        establishmentId: EST_ID,
      });
      req.flush(mockCustomer);
    });

    it('salva sessão e atualiza signals após registro', () => {
      service
        .register('João', 'joao@test.com', '11999999999', 'senha123')
        .subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/register`);
      req.flush(mockCustomer);

      expect(service.isAuthenticated()).toBe(true);
      expect(service.token()).toBe(mockCustomer.accessToken);
    });
  });

  // ── logout() ──────────────────────────────────────────────────────────────

  describe('logout()', () => {
    beforeEach(() => {
      // Simula sessão ativa
      localStorage.setItem('auth_token', mockCustomer.accessToken);
      localStorage.setItem('auth_user', JSON.stringify(mockCustomer.user));
      service.restoreSession();
    });

    it('limpa signals ao fazer logout', () => {
      service.logout();

      expect(service.token()).toBeNull();
      expect(service.currentUser()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
    });

    it('remove dados do localStorage ao fazer logout', () => {
      service.logout();

      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(localStorage.getItem('auth_user')).toBeNull();
    });

    it('navega para /auth/login ao fazer logout', () => {
      service.logout();

      expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
    });
  });
});
