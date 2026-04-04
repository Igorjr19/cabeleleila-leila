import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { signal } from '@angular/core';
import { Role, UserProfile } from '@cabeleleila/contracts';
import { roleGuard } from './role.guard';
import { AuthService } from '../services/auth.service';

const makeUser = (role: Role): UserProfile => ({
  id: 'user-1',
  name: 'Test',
  email: 'test@test.com',
  role,
  establishmentId: 'est-1',
});

describe('roleGuard', () => {
  let routerSpy: jasmine.SpyObj<Router>;
  let currentUserSignal: ReturnType<typeof signal<UserProfile | null>>;

  const makeRoute = (roles: Role[]): ActivatedRouteSnapshot =>
    ({ data: { roles } }) as unknown as ActivatedRouteSnapshot;

  beforeEach(() => {
    currentUserSignal = signal<UserProfile | null>(null);
    routerSpy = jasmine.createSpyObj('Router', ['createUrlTree']);
    routerSpy.createUrlTree.and.callFake(
      (commands: unknown[]) => commands as unknown as UrlTree,
    );

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: { currentUser: currentUserSignal },
        },
        { provide: Router, useValue: routerSpy },
      ],
    });
  });

  const runGuard = (route: ActivatedRouteSnapshot) =>
    TestBed.runInInjectionContext(() => roleGuard(route, {} as never));

  it('retorna true quando usuário tem a role necessária', () => {
    currentUserSignal.set(makeUser(Role.ADMIN));
    const result = runGuard(makeRoute([Role.ADMIN]));
    expect(result).toBe(true);
  });

  it('retorna true quando a role do usuário está entre várias permitidas', () => {
    currentUserSignal.set(makeUser(Role.CUSTOMER));
    const result = runGuard(makeRoute([Role.ADMIN, Role.CUSTOMER]));
    expect(result).toBe(true);
  });

  it('redireciona para /bookings quando usuário não tem a role necessária', () => {
    currentUserSignal.set(makeUser(Role.CUSTOMER));
    runGuard(makeRoute([Role.ADMIN]));
    expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/bookings']);
  });

  it('redireciona quando não há usuário autenticado', () => {
    currentUserSignal.set(null);
    runGuard(makeRoute([Role.ADMIN]));
    expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/bookings']);
  });

  it('CUSTOMER não acessa rota de ADMIN', () => {
    currentUserSignal.set(makeUser(Role.CUSTOMER));
    const result = runGuard(makeRoute([Role.ADMIN]));
    expect(result).not.toBe(true);
  });
});
