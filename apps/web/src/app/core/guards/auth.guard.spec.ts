import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { signal } from '@angular/core';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  let routerSpy: jasmine.SpyObj<Router>;
  let isAuthenticatedSignal: ReturnType<typeof signal<boolean>>;

  beforeEach(() => {
    isAuthenticatedSignal = signal(false);
    routerSpy = jasmine.createSpyObj('Router', ['navigate', 'createUrlTree']);
    routerSpy.createUrlTree.and.callFake(
      (commands: unknown[]) => commands as unknown as UrlTree,
    );

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: { isAuthenticated: isAuthenticatedSignal },
        },
        { provide: Router, useValue: routerSpy },
      ],
    });
  });

  const runGuard = () =>
    TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

  it('retorna true quando usuário está autenticado', () => {
    isAuthenticatedSignal.set(true);
    const result = runGuard();
    expect(result).toBe(true);
  });

  it('redireciona para /auth/login quando não autenticado', () => {
    isAuthenticatedSignal.set(false);
    runGuard();
    expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/auth/login']);
  });

  it('não redireciona quando autenticado', () => {
    isAuthenticatedSignal.set(true);
    runGuard();
    expect(routerSpy.createUrlTree).not.toHaveBeenCalled();
  });
});
