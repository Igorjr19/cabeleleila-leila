import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from 'primeng/message';
import { Role } from '@cabeleleila/contracts';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
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
      <h2 class="text-center m-0">Entrar</h2>

      @if (error()) {
        <p-message severity="error" [text]="error()!" />
      }

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
        <label for="password">Senha</label>
        <p-password
          id="password"
          formControlName="password"
          [feedback]="false"
          [toggleMask]="true"
          styleClass="w-full"
          inputStyleClass="w-full"
          placeholder="••••••"
        />
      </div>

      <p-button
        type="submit"
        label="Entrar"
        [loading]="loading()"
        [disabled]="form.invalid"
        styleClass="w-full"
      />

      <p class="text-center m-0 text-sm">
        Não tem conta? <a routerLink="/auth/register">Cadastre-se</a>
      </p>
    </form>
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);

    const { email, password } = this.form.getRawValue();
    this.auth.login(email!, password!).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.user.role === Role.ADMIN) {
          this.router.navigate(['/admin/dashboard']);
        } else {
          this.router.navigate(['/bookings']);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message ?? 'E-mail ou senha inválidos.');
      },
    });
  }
}
