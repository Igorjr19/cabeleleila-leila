import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputMaskModule } from 'primeng/inputmask';
import { MessageModule } from 'primeng/message';
import { MessageService } from 'primeng/api';
import { UserApiService } from '../../core/services/user-api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    InputMaskModule,
    MessageModule,
  ],
  template: `
    <div class="max-w-lg mx-auto">
      <h2 class="mb-4">Meu Perfil</h2>

      <p-card>
        <form
          [formGroup]="form"
          (ngSubmit)="submit()"
          class="flex flex-column gap-3"
        >
          <div class="flex flex-column gap-1">
            <label>E-mail</label>
            <input
              pInputText
              [value]="email()"
              readonly
              class="w-full surface-100"
            />
          </div>

          <div class="flex flex-column gap-1">
            <label for="name">Nome</label>
            <input id="name" pInputText formControlName="name" class="w-full" />
          </div>

          <div class="flex flex-column gap-1">
            <label for="phone">Telefone</label>
            <p-inputmask
              id="phone"
              formControlName="phone"
              mask="(99) 99999-9999"
              placeholder="(XX) XXXXX-XXXX"
              styleClass="w-full"
            />
          </div>

          <p-button
            type="submit"
            label="Salvar"
            [loading]="loading()"
            [disabled]="form.invalid || form.pristine"
            styleClass="w-full"
          />
        </form>
      </p-card>
    </div>
  `,
})
export class ProfileComponent implements OnInit {
  private readonly userApi = inject(UserApiService);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(false);
  readonly email = signal('');

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: [''],
  });

  ngOnInit(): void {
    this.email.set(this.authService.currentUser()?.email ?? '');
    this.userApi.getProfile().subscribe({
      next: (u) => this.form.patchValue({ name: u.name, phone: u.phone ?? '' }),
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    const { name, phone } = this.form.getRawValue();

    this.userApi
      .updateProfile({ name: name!, phone: phone || undefined })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.form.markAsPristine();
          this.messageService.add({
            severity: 'success',
            summary: 'Salvo',
            detail: 'Perfil atualizado.',
          });
        },
        error: () => {
          this.loading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Erro',
            detail: 'Não foi possível salvar.',
          });
        },
      });
  }
}
