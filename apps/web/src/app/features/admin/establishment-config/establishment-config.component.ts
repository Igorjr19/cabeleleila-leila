import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { InputMaskModule } from 'primeng/inputmask';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { EstablishmentApiService } from '../../../core/services/establishment-api.service';

@Component({
  selector: 'app-establishment-config',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    InputMaskModule,
    MessageModule,
    DividerModule,
  ],
  template: `
    <div class="max-w-lg mx-auto">
      <h2 class="mb-4">Configurações do Estabelecimento</h2>

      <p-card>
        <form
          [formGroup]="form"
          (ngSubmit)="submit()"
          class="flex flex-column gap-4"
          formGroupName=""
        >
          <div formGroupName="business_hours" class="flex flex-column gap-3">
            <h3 class="m-0">Horário de Funcionamento</h3>

            <div class="grid">
              <div class="col-6 flex flex-column gap-1">
                <label>Abertura</label>
                <p-inputmask
                  formControlName="open"
                  mask="99:99"
                  placeholder="08:00"
                  styleClass="w-full"
                />
              </div>
              <div class="col-6 flex flex-column gap-1">
                <label>Fechamento</label>
                <p-inputmask
                  formControlName="close"
                  mask="99:99"
                  placeholder="18:00"
                  styleClass="w-full"
                />
              </div>
              <div class="col-6 flex flex-column gap-1">
                <label>Início do almoço</label>
                <p-inputmask
                  formControlName="lunchStart"
                  mask="99:99"
                  placeholder="12:00"
                  styleClass="w-full"
                />
              </div>
              <div class="col-6 flex flex-column gap-1">
                <label>Fim do almoço</label>
                <p-inputmask
                  formControlName="lunchEnd"
                  mask="99:99"
                  placeholder="13:00"
                  styleClass="w-full"
                />
              </div>
            </div>
          </div>

          <p-divider />

          <div class="flex flex-column gap-1">
            <label>Antecedência mínima para alteração online (dias)</label>
            <p-inputnumber
              formControlName="min_days_for_online_update"
              [min]="1"
              [max]="30"
              styleClass="w-full"
            />
            <small class="text-color-secondary"
              >Clientes precisam deste prazo para editar/cancelar online.</small
            >
          </div>

          <p-button
            type="submit"
            label="Salvar configurações"
            [loading]="loading()"
            [disabled]="form.invalid || form.pristine"
            styleClass="w-full"
          />
        </form>
      </p-card>
    </div>
  `,
})
export class EstablishmentConfigComponent implements OnInit {
  private readonly establishmentApi = inject(EstablishmentApiService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(false);

  readonly form = this.fb.group({
    min_days_for_online_update: [
      2,
      [Validators.required, Validators.min(1), Validators.max(30)],
    ],
    business_hours: this.fb.group({
      open: ['08:00', Validators.required],
      close: ['18:00', Validators.required],
      lunchStart: ['12:00', Validators.required],
      lunchEnd: ['13:00', Validators.required],
    }),
  });

  ngOnInit(): void {
    this.establishmentApi.getConfig().subscribe({
      next: (res) => {
        if (res.config) {
          this.form.patchValue({
            min_days_for_online_update: res.config.min_days_for_online_update,
            business_hours: res.config.business_hours,
          });
          this.form.markAsPristine();
        }
      },
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);

    const v = this.form.getRawValue();
    this.establishmentApi
      .updateConfig({
        min_days_for_online_update: v.min_days_for_online_update!,
        business_hours: v.business_hours as {
          open: string;
          close: string;
          lunchStart: string;
          lunchEnd: string;
        },
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.form.markAsPristine();
          this.messageService.add({
            severity: 'success',
            summary: 'Salvo',
            detail: 'Configurações atualizadas.',
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
