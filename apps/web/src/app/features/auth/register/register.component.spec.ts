import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Role } from '@cabeleleila/contracts';
import { AuthService } from '../../../core/services/auth.service';
import { RegisterComponent } from './register.component';

const mockResponse = {
  accessToken: 'jwt',
  user: {
    id: '1',
    name: 'Maria',
    email: 'maria@test.com',
    role: Role.CUSTOMER,
    establishmentId: 'est-1',
  },
};

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let authSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    authSpy = jasmine.createSpyObj('AuthService', ['register']);

    await TestBed.configureTestingModule({
      imports: [RegisterComponent, ReactiveFormsModule],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authSpy },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(RegisterComponent);
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

    it('é inválido sem nome', () => {
      component.form.setValue({
        name: '',
        email: 'maria@test.com',
        password: 'senha123',
        confirmPassword: 'senha123',
      });
      expect(component.form.invalid).toBe(true);
    });

    it('é inválido com nome menor que 2 caracteres', () => {
      component.form.setValue({
        name: 'A',
        email: 'maria@test.com',
        password: 'senha123',
        confirmPassword: 'senha123',
      });
      expect(component.form.get('name')!.hasError('minlength')).toBe(true);
    });

    it('é inválido com email fora do formato', () => {
      component.form.setValue({
        name: 'Maria',
        email: 'invalido',
        password: 'senha123',
        confirmPassword: 'senha123',
      });
      expect(component.form.get('email')!.hasError('email')).toBe(true);
    });

    it('é inválido com senha menor que 6 caracteres', () => {
      component.form.setValue({
        name: 'Maria',
        email: 'maria@test.com',
        password: '123',
        confirmPassword: '123',
      });
      expect(component.form.get('password')!.hasError('minlength')).toBe(true);
    });

    it('é válido com todos os campos preenchidos corretamente', () => {
      component.form.setValue({
        name: 'Maria',
        email: 'maria@test.com',
        password: 'senha123',
        confirmPassword: 'senha123',
      });
      expect(component.form.valid).toBe(true);
    });
  });

  // ── passwordMatchValidator ─────────────────────────────────────────────────

  describe('passwordMatchValidator', () => {
    it('formulário é inválido quando senhas não coincidem', () => {
      component.form.setValue({
        name: 'Maria',
        email: 'maria@test.com',
        password: 'senha123',
        confirmPassword: 'senha456',
      });
      expect(component.form.hasError('passwordMismatch')).toBe(true);
      expect(component.form.invalid).toBe(true);
    });

    it('formulário é válido quando senhas coincidem', () => {
      component.form.setValue({
        name: 'Maria',
        email: 'maria@test.com',
        password: 'senha123',
        confirmPassword: 'senha123',
      });
      expect(component.form.hasError('passwordMismatch')).toBe(false);
    });

    it('erro passwordMismatch desaparece ao alinhar as senhas', () => {
      component.form.setValue({
        name: 'Maria',
        email: 'maria@test.com',
        password: 'senha123',
        confirmPassword: 'errada',
      });
      expect(component.form.hasError('passwordMismatch')).toBe(true);

      component.form.patchValue({ confirmPassword: 'senha123' });
      expect(component.form.hasError('passwordMismatch')).toBe(false);
    });
  });

  // ── submit() ───────────────────────────────────────────────────────────────

  describe('submit()', () => {
    const validData = {
      name: 'Maria',
      email: 'maria@test.com',
      password: 'senha123',
      confirmPassword: 'senha123',
    };

    it('não chama register quando formulário é inválido', () => {
      component.submit();
      expect(authSpy.register).not.toHaveBeenCalled();
    });

    it('chama AuthService.register com name, email e senha', fakeAsync(() => {
      authSpy.register.and.returnValue(of(mockResponse));
      component.form.setValue(validData);

      component.submit();
      tick();

      expect(authSpy.register).toHaveBeenCalledWith(
        'Maria',
        'maria@test.com',
        'senha123',
      );
    }));

    it('navega para /bookings após registro bem-sucedido', fakeAsync(() => {
      authSpy.register.and.returnValue(of(mockResponse));
      component.form.setValue(validData);

      component.submit();
      tick();

      expect(router.navigate).toHaveBeenCalledWith(['/bookings']);
    }));

    it('define mensagem de erro quando registro falha', fakeAsync(() => {
      authSpy.register.and.returnValue(
        throwError(() => ({ error: { message: 'E-mail já cadastrado' } })),
      );
      component.form.setValue(validData);

      component.submit();
      tick();

      expect(component.error()).toBe('E-mail já cadastrado');
      expect(component.loading()).toBe(false);
    }));

    it('usa mensagem padrão quando erro não tem message', fakeAsync(() => {
      authSpy.register.and.returnValue(throwError(() => ({})));
      component.form.setValue(validData);

      component.submit();
      tick();

      expect(component.error()).toBe('Erro ao criar conta. Tente novamente.');
    }));

    it('loading é false após registro com erro', fakeAsync(() => {
      authSpy.register.and.returnValue(throwError(() => ({})));
      component.form.setValue(validData);

      component.submit();
      tick();

      expect(component.loading()).toBe(false);
    }));
  });
});
