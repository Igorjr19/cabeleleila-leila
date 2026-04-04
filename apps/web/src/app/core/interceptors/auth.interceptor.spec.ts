import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let tokenSignal: ReturnType<typeof signal<string | null>>;
  let logoutSpy: jasmine.Spy;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    tokenSignal = signal<string | null>(null);
    logoutSpy = jasmine.createSpy('logout');
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: { token: tokenSignal, logout: logoutSpy },
        },
        { provide: Router, useValue: routerSpy },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('adiciona header Authorization quando token está presente', () => {
    tokenSignal.set('my.jwt.token');

    http.get('/api/test').subscribe();

    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.get('Authorization')).toBe(
      'Bearer my.jwt.token',
    );
    req.flush({});
  });

  it('não adiciona header Authorization quando não há token', () => {
    tokenSignal.set(null);

    http.get('/api/test').subscribe();

    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('chama logout quando resposta é 401', () => {
    tokenSignal.set('my.jwt.token');

    http.get('/api/protected').subscribe({ error: () => {} });

    const req = httpMock.expectOne('/api/protected');
    req.flush(
      { message: 'Unauthorized' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(logoutSpy).toHaveBeenCalled();
  });

  it('não chama logout para outros erros HTTP (ex: 400)', () => {
    tokenSignal.set('my.jwt.token');

    http.get('/api/bad-request').subscribe({ error: () => {} });

    const req = httpMock.expectOne('/api/bad-request');
    req.flush(
      { message: 'Bad Request' },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(logoutSpy).not.toHaveBeenCalled();
  });

  it('não chama logout para erro 403', () => {
    tokenSignal.set('my.jwt.token');

    http.get('/api/forbidden').subscribe({ error: () => {} });

    const req = httpMock.expectOne('/api/forbidden');
    req.flush(
      { message: 'Forbidden' },
      { status: 403, statusText: 'Forbidden' },
    );

    expect(logoutSpy).not.toHaveBeenCalled();
  });

  it('propaga o erro original para o subscriber', (done) => {
    tokenSignal.set(null);

    http.get('/api/test').subscribe({
      error: (err) => {
        expect(err.status).toBe(500);
        done();
      },
    });

    const req = httpMock.expectOne('/api/test');
    req.flush({}, { status: 500, statusText: 'Server Error' });
  });
});
