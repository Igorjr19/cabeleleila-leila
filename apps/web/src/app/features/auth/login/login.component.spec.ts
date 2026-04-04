import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Role } from '@cabeleleila/contracts';
import { AuthService } from '../../../core/services/auth.service';
import { LoginComponent } from './login.component';

const makeAuthResponse = (role: Role) => ({
  accessToken: 'jwt',
  user: {
    id: '1',
    name: 'Test',
    email: 'test@test.com',
    role,
    establishmentId: 'est-1',
  },
});

describe('LoginComponent', () => {
  let component: LoginComponent;
  let authSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    authSpy = jasmine.createSpyObj('AuthService', ['login']);

    await TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authSpy },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.stub();
    fixture.detectChanges();
  });

  // ── Formulário ─────────────────────────────────────────────────────────────

  describe('formulário', () => {
    it('começa inválido com campos vazios', () => {
      expect(component.form.invalid).toBe(true);
    });

    it('é inválido sem email', () => {
      component.form.setValue({ email: '', password: 'senha123' });
      expect(component.form.invalid).toBe(true);
    });

    it('é inválido com email fora do formato', () => {
      component.form.setValue({ email: 'nao-eh-email', password: 'senha123' });
      expect(component.form.get('email')!.hasError('email')).toBe(true);
    });

    it('é inválido com senha menor que 6 caracteres', () => {
      component.form.setValue({ email: 'test@test.com', password: '123' });
      expect(component.form.get('password')!.hasError('minlength')).toBe(true);
    });

    it('é válido com email e senha corretos', () => {
      component.form.setValue({ email: 'test@test.com', password: 'senha123' });
      expect(component.form.valid).toBe(true);
    });
  });

  // ── submit() ───────────────────────────────────────────────────────────────

  describe('submit()', () => {
    it('não chama login quando formulário é inválido', () => {
      component.form.setValue({ email: '', password: '' });
      component.submit();
      expect(authSpy.login).not.toHaveBeenCalled();
    });

    it('chama AuthService.login com email e senha corretos', fakeAsync(() => {
      authSpy.login.and.returnValue(of(makeAuthResponse(Role.CUSTOMER)));
      component.form.setValue({ email: 'test@test.com', password: 'senha123' });

      component.submit();
      tick();

      expect(authSpy.login).toHaveBeenCalledWith('test@test.com', 'senha123');
    }));

    it('navega para /bookings após login como CUSTOMER', fakeAsync(() => {
      authSpy.login.and.returnValue(of(makeAuthResponse(Role.CUSTOMER)));
      component.form.setValue({ email: 'test@test.com', password: 'senha123' });

      component.submit();
      tick();

      expect(router.navigate).toHaveBeenCalledWith(['/bookings']);
    }));

    it('navega para /admin/dashboard após login como ADMIN', fakeAsync(() => {
      authSpy.login.and.returnValue(of(makeAuthResponse(Role.ADMIN)));
      component.form.setValue({
        email: 'leila@test.com',
        password: 'admin123',
      });

      component.submit();
      tick();

      expect(router.navigate).toHaveBeenCalledWith(['/admin/dashboard']);
    }));

    it('loading é false após login bem-sucedido', fakeAsync(() => {
      authSpy.login.and.returnValue(of(makeAuthResponse(Role.CUSTOMER)));
      component.form.setValue({ email: 'test@test.com', password: 'senha123' });

      component.submit();
      tick();

      expect(component.loading()).toBe(false);
    }));

    it('define mensagem de erro quando login falha', fakeAsync(() => {
      authSpy.login.and.returnValue(
        throwError(() => ({ error: { message: 'Credenciais inválidas' } })),
      );
      component.form.setValue({ email: 'test@test.com', password: 'errada' });

      component.submit();
      tick();

      expect(component.error()).toBe('Credenciais inválidas');
      expect(component.loading()).toBe(false);
    }));

    it('usa mensagem padrão quando erro não tem message', fakeAsync(() => {
      authSpy.login.and.returnValue(throwError(() => ({})));
      component.form.setValue({ email: 'test@test.com', password: 'senha123' });

      component.submit();
      tick();

      expect(component.error()).toBe('E-mail ou senha inválidos.');
    }));

    it('limpa erro anterior antes de nova tentativa', fakeAsync(() => {
      // Primeiro login falha
      authSpy.login.and.returnValue(
        throwError(() => ({ error: { message: 'Erro' } })),
      );
      component.form.setValue({ email: 'test@test.com', password: 'senha123' });
      component.submit();
      tick();
      expect(component.error()).not.toBeNull();

      // Segundo login bem-sucedido
      authSpy.login.and.returnValue(of(makeAuthResponse(Role.CUSTOMER)));
      component.submit();
      tick();

      expect(component.error()).toBeNull();
    }));
  });
});
