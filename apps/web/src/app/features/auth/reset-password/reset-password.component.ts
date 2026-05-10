import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { TooltipModule } from 'primeng/tooltip';
import { AuthService } from '../../../core/services/auth.service';

function passwordMatchValidator(
  control: AbstractControl,
): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirm = control.get('confirmPassword')?.value;
  return password === confirm ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    PasswordModule,
    MessageModule,
    TooltipModule,
    RouterLink,
  ],
  template: `
    <form
      [formGroup]="form"
      (ngSubmit)="submit()"
      class="flex flex-column gap-3"
    >
      <div class="flex align-items-center gap-2">
        <a
          pButton
          text
          rounded
          icon="pi pi-arrow-left"
          routerLink="/"
          pTooltip="Voltar para a home"
          tooltipPosition="right"
        ></a>
        <h2 class="m-0 flex-1 text-center" style="margin-right: 2.5rem">
          Redefinir senha
        </h2>
      </div>

      @if (success()) {
        <p-message
          severity="success"
          text="Senha redefinida! Você pode fazer login com sua nova senha."
        />
        <p-button
          label="Ir para login"
          (onClick)="router.navigate(['/auth/login'])"
          styleClass="w-full"
        />
      } @else if (!token) {
        <p-message
          severity="error"
          text="Link inválido. Solicite um novo em 'Esqueci minha senha'."
        />
        <p-button
          label="Solicitar novo link"
          severity="secondary"
          (onClick)="router.navigate(['/auth/forgot-password'])"
          styleClass="w-full"
        />
      } @else {
        @if (error()) {
          <p-message severity="error" [text]="error()!" />
        }

        <p class="text-color-secondary m-0 text-sm">
          Crie uma nova senha. Use pelo menos 6 caracteres.
        </p>

        <div class="flex flex-column gap-1">
          <label for="password">Nova senha</label>
          <p-password
            id="password"
            formControlName="password"
            [toggleMask]="true"
            placeholder="Mínimo 6 caracteres"
            styleClass="w-full"
            inputStyleClass="w-full"
          />
        </div>

        <div class="flex flex-column gap-1">
          <label for="confirmPassword">Confirmar senha</label>
          <p-password
            id="confirmPassword"
            formControlName="confirmPassword"
            [feedback]="false"
            [toggleMask]="true"
            placeholder="Repita a senha"
            styleClass="w-full"
            inputStyleClass="w-full"
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
          label="Redefinir senha"
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
export class ResetPasswordComponent implements OnInit {
  readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal(false);

  token = '';

  readonly form = this.fb.group(
    {
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordMatchValidator },
  );

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
  }

  submit(): void {
    if (this.form.invalid || !this.token) return;
    this.loading.set(true);
    this.error.set(null);

    const { password } = this.form.getRawValue();
    this.auth.resetPassword(this.token, password!).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(
          err.error?.message ?? 'Não foi possível redefinir a senha.',
        );
      },
    });
  }
}
