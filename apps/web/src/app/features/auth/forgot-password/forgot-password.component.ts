import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    MessageModule,
    RouterLink,
  ],
  template: `
    <form
      [formGroup]="form"
      (ngSubmit)="submit()"
      class="flex flex-column gap-3"
    >
      <h2 class="text-center m-0">Recuperar senha</h2>

      @if (sentInfo(); as info) {
        <p-message
          severity="success"
          text="Pronto! Se o e-mail estiver cadastrado, geramos um link de redefinição."
        />
        @if (info.token) {
          <div class="surface-50 border-round p-3 flex flex-column gap-2">
            <p class="text-sm m-0 text-color-secondary">
              <strong>Modo demo:</strong> em produção, o link iria por e-mail.
              Aqui ele está logo abaixo (válido por 30 minutos):
            </p>
            <a
              [routerLink]="['/auth/reset-password']"
              [queryParams]="{ token: info.token }"
              class="text-primary font-medium"
              style="word-break: break-all"
            >
              /auth/reset-password?token={{ info.token.slice(0, 16) }}…
            </a>
            <p-button
              label="Abrir link de redefinição"
              icon="pi pi-arrow-right"
              size="small"
              styleClass="w-full"
              (onClick)="goReset(info.token)"
            />
          </div>
        }
      } @else {
        @if (error()) {
          <p-message severity="error" [text]="error()!" />
        }

        <p class="text-color-secondary m-0 text-sm">
          Informe o e-mail cadastrado e geraremos um link para você redefinir a
          senha.
        </p>

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

        <p-button
          type="submit"
          label="Enviar link"
          [loading]="loading()"
          [disabled]="form.invalid"
          styleClass="w-full"
        />
      }

      <p class="text-center m-0 text-sm">
        <a routerLink="/auth/login">Voltar para o login</a>
      </p>
    </form>
  `,
})
export class ForgotPasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly sentInfo = signal<{
    token: string | null;
    expiresAt: string | null;
  } | null>(null);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);

    const { email } = this.form.getRawValue();
    this.auth.requestPasswordReset(email!).subscribe({
      next: (info) => {
        this.loading.set(false);
        this.sentInfo.set(info);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(
          err.error?.message ?? 'Não foi possível processar a solicitação.',
        );
      },
    });
  }

  goReset(token: string): void {
    this.router.navigate(['/auth/reset-password'], { queryParams: { token } });
  }
}
