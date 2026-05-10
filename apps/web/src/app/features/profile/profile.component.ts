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
    <div class="flex justify-content-center py-4">
      <div class="w-full" style="max-width: 28rem">
        <p-card>
          <div class="flex flex-column align-items-center gap-2 mb-4">
            <div class="profile-avatar">
              <i class="pi pi-user"></i>
            </div>
            <h2 class="m-0">Meu Perfil</h2>
            <span class="text-sm text-color-secondary">{{ email() }}</span>
          </div>

          <form
            [formGroup]="form"
            (ngSubmit)="submit()"
            class="flex flex-column gap-3"
          >
            <div class="flex flex-column gap-1">
              <label for="name" class="text-sm font-medium">Nome</label>
              <input
                id="name"
                pInputText
                formControlName="name"
                class="w-full"
              />
            </div>

            <div class="flex flex-column gap-1">
              <label for="phone" class="text-sm font-medium">Telefone</label>
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
              icon="pi pi-check"
              [loading]="loading()"
              [disabled]="form.invalid || form.pristine"
              styleClass="w-full mt-2"
            />
          </form>
        </p-card>
      </div>
    </div>
  `,
  styles: [
    `
      .profile-avatar {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 4rem;
        height: 4rem;
        border-radius: 50%;
        background: var(--primary-50, #fef2f4);
        color: var(--primary-color);
        font-size: 1.75rem;
      }
    `,
  ],
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
