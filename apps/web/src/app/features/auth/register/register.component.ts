import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputMaskModule } from 'primeng/inputmask';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../../../core/services/auth.service';

function passwordMatchValidator(
  control: AbstractControl,
): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirm = control.get('confirmPassword')?.value;
  return password === confirm ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    InputMaskModule,
    PasswordModule,
    MessageModule,
    RouterLink,
  ],
  template: `
    <form
      [formGroup]="form"
      (ngSubmit)="submit()"
      class="flex flex-column gap-3"
    >
      <h2 class="text-center m-0">Criar Conta</h2>

      @if (error()) {
        <p-message severity="error" [text]="error()!" />
      }

      <div class="flex flex-column gap-1">
        <label for="name">Nome completo</label>
        <input
          id="name"
          pInputText
          formControlName="name"
          placeholder="Maria Silva"
          class="w-full"
        />
      </div>

      <div class="flex flex-column gap-1">
        <label for="email">E-mail</label>
        <input
          id="email"
          type="email"
          pInputText
          formControlName="email"
          placeholder="seu@email.com"
          class="w-full"
        />
      </div>

      <div class="flex flex-column gap-1">
        <label for="phone">Telefone</label>
        <p-inputmask
          id="phone"
          formControlName="phone"
          mask="(99) 99999-9999"
          placeholder="(11) 99999-9999"
          styleClass="w-full"
        />
      </div>

      <div class="flex flex-column gap-1">
        <label for="password">Senha</label>
        <p-password
          id="password"
          formControlName="password"
          [toggleMask]="true"
          styleClass="w-full"
          inputStyleClass="w-full"
          placeholder="Mínimo 6 caracteres"
        />
      </div>

      <div class="flex flex-column gap-1">
        <label for="confirmPassword">Confirmar senha</label>
        <p-password
          id="confirmPassword"
          formControlName="confirmPassword"
          [feedback]="false"
          [toggleMask]="true"
          styleClass="w-full"
          inputStyleClass="w-full"
          placeholder="Repita a senha"
        />
        @if (
          form.hasError('passwordMismatch') &&
          form.get('confirmPassword')?.touched
        ) {
          <small class="p-error">As senhas não coincidem.</small>
        }
      </div>

      <p-button
        type="submit"
        label="Criar conta"
        [loading]="loading()"
        [disabled]="form.invalid"
        styleClass="w-full"
      />

      <p class="text-center m-0 text-sm">
        Já tem conta? <a routerLink="/auth/login">Entrar</a>
      </p>
    </form>
  `,
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.group(
    {
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordMatchValidator },
  );

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);

    const { name, email, phone, password } = this.form.getRawValue();
    this.auth.register(name!, email!, phone!, password!).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/bookings']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(
          err.error?.message ?? 'Erro ao criar conta. Tente novamente.',
        );
      },
    });
  }
}
