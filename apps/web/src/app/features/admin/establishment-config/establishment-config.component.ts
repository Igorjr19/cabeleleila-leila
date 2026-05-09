import { Component, OnInit, inject, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  BusinessHours,
  DEFAULT_BUSINESS_HOURS,
  EstablishmentConfig,
} from '@cabeleleila/contracts';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { DividerModule } from 'primeng/divider';
import { InputMaskModule } from 'primeng/inputmask';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { EstablishmentApiService } from '../../../core/services/establishment-api.service';

const DAY_NAMES = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

interface DayFormGroup extends FormGroup {
  controls: {
    dayOfWeek: ReturnType<FormBuilder['control']>;
    isOpen: ReturnType<FormBuilder['control']>;
    openTime: ReturnType<FormBuilder['control']>;
    closeTime: ReturnType<FormBuilder['control']>;
    hasLunchBreak: ReturnType<FormBuilder['control']>;
    lunchStart: ReturnType<FormBuilder['control']>;
    lunchEnd: ReturnType<FormBuilder['control']>;
  };
}

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
    CheckboxModule,
    ToggleSwitchModule,
  ],
  template: `
    <div class="max-w-3xl mx-auto">
      <h2 class="mb-1">Configurações do Salão</h2>
      <p class="text-color-secondary mt-0 mb-4">
        Defina os horários de funcionamento e a antecedência mínima para
        alterações online.
      </p>

      <form
        [formGroup]="form"
        (ngSubmit)="submit()"
        class="flex flex-column gap-3"
      >
        <p-card>
          <ng-template pTemplate="title">
            <span class="flex align-items-center gap-2">
              <i class="pi pi-calendar text-primary"></i>
              Cancelamento e edição online
            </span>
          </ng-template>
          <div class="flex flex-column gap-1 mt-1">
            <label class="font-medium text-sm" for="minDays">
              Antecedência mínima (dias)
            </label>
            <p-inputnumber
              inputId="minDays"
              formControlName="minDaysForOnlineUpdate"
              [min]="1"
              [max]="30"
              styleClass="w-full"
            />
            <small class="text-color-secondary">
              Prazo mínimo para clientes editarem ou cancelarem online. Datas
              mais próximas só por telefone.
            </small>
          </div>
        </p-card>

        <p-card>
          <ng-template pTemplate="title">
            <span class="flex align-items-center gap-2">
              <i class="pi pi-clock text-primary"></i>
              Horário de funcionamento
            </span>
          </ng-template>

          <div formArrayName="businessHours" class="flex flex-column gap-3">
            @for (day of daysFormArray.controls; track $index; let i = $index) {
              <div [formGroupName]="i" class="surface-50 border-round p-3">
                <div
                  class="flex align-items-center justify-content-between flex-wrap gap-2"
                >
                  <div class="flex align-items-center gap-3">
                    <p-toggleswitch formControlName="isOpen" />
                    <span class="font-semibold">{{ dayName(i) }}</span>
                  </div>
                  @if (!day.get('isOpen')!.value) {
                    <span class="text-sm text-color-secondary">Fechado</span>
                  }
                </div>

                @if (day.get('isOpen')!.value) {
                  <div class="grid mt-3">
                    <div class="col-6 md:col-3 flex flex-column gap-1">
                      <label class="font-medium text-sm">Abertura</label>
                      <p-inputmask
                        formControlName="openTime"
                        mask="99:99"
                        placeholder="09:00"
                        styleClass="w-full"
                      />
                    </div>
                    <div class="col-6 md:col-3 flex flex-column gap-1">
                      <label class="font-medium text-sm">Fechamento</label>
                      <p-inputmask
                        formControlName="closeTime"
                        mask="99:99"
                        placeholder="18:00"
                        styleClass="w-full"
                      />
                    </div>
                    <div
                      class="col-12 md:col-6 flex align-items-end gap-2 pb-1"
                    >
                      <p-checkbox
                        formControlName="hasLunchBreak"
                        binary="true"
                        inputId="lunch-{{ i }}"
                      />
                      <label
                        for="lunch-{{ i }}"
                        class="text-sm cursor-pointer mb-0"
                      >
                        Tem horário de almoço
                      </label>
                    </div>

                    @if (day.get('hasLunchBreak')!.value) {
                      <div class="col-6 md:col-3 flex flex-column gap-1">
                        <label class="font-medium text-sm"
                          >Almoço (início)</label
                        >
                        <p-inputmask
                          formControlName="lunchStart"
                          mask="99:99"
                          placeholder="12:00"
                          styleClass="w-full"
                        />
                      </div>
                      <div class="col-6 md:col-3 flex flex-column gap-1">
                        <label class="font-medium text-sm">Almoço (fim)</label>
                        <p-inputmask
                          formControlName="lunchEnd"
                          mask="99:99"
                          placeholder="13:00"
                          styleClass="w-full"
                        />
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>
        </p-card>

        @if (formError()) {
          <p-message severity="error" [text]="formError()!" />
        }

        <p-button
          type="submit"
          label="Salvar configurações"
          icon="pi pi-check"
          [loading]="loading()"
          [disabled]="form.invalid || form.pristine"
          styleClass="w-full"
        />
      </form>
    </div>
  `,
})
export class EstablishmentConfigComponent implements OnInit {
  private readonly establishmentApi = inject(EstablishmentApiService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(false);
  readonly formError = signal<string | null>(null);

  readonly form = this.fb.group({
    minDaysForOnlineUpdate: [
      2,
      [Validators.required, Validators.min(1), Validators.max(30)],
    ],
    businessHours: this.fb.array(
      DEFAULT_BUSINESS_HOURS.map((h) => this.makeDayGroup(h)),
    ),
  });

  get daysFormArray(): FormArray<DayFormGroup> {
    return this.form.get('businessHours') as FormArray<DayFormGroup>;
  }

  ngOnInit(): void {
    this.establishmentApi.getConfig().subscribe({
      next: (cfg) => this.applyConfig(cfg),
      error: () =>
        this.formError.set('Não foi possível carregar a configuração atual.'),
    });
  }

  dayName(dayOfWeek: number): string {
    return DAY_NAMES[dayOfWeek] ?? '';
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.formError.set(null);

    const dto = this.toDto();
    this.establishmentApi.updateConfig(dto).subscribe({
      next: () => {
        this.loading.set(false);
        this.form.markAsPristine();
        this.messageService.add({
          severity: 'success',
          summary: 'Salvo',
          detail: 'Configurações atualizadas.',
        });
      },
      error: (err) => {
        this.loading.set(false);
        const msg: string =
          err.error?.message ?? 'Não foi possível salvar as configurações.';
        this.formError.set(Array.isArray(msg) ? msg.join(' / ') : msg);
      },
    });
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  private makeDayGroup(h: BusinessHours): DayFormGroup {
    return this.fb.group({
      dayOfWeek: [h.dayOfWeek, Validators.required],
      isOpen: [h.isOpen],
      openTime: [
        h.openTime,
        [Validators.required, Validators.pattern(TIME_PATTERN)],
      ],
      closeTime: [
        h.closeTime,
        [Validators.required, Validators.pattern(TIME_PATTERN)],
      ],
      hasLunchBreak: [!!(h.lunchStart && h.lunchEnd)],
      lunchStart: [h.lunchStart ?? '12:00'],
      lunchEnd: [h.lunchEnd ?? '13:00'],
    }) as DayFormGroup;
  }

  private applyConfig(cfg: EstablishmentConfig): void {
    this.form.patchValue({
      minDaysForOnlineUpdate: cfg.minDaysForOnlineUpdate,
    });

    // Replace each day group with values from the config (matching by dayOfWeek)
    cfg.businessHours.forEach((h) => {
      const idx = this.daysFormArray.controls.findIndex(
        (g) => g.get('dayOfWeek')!.value === h.dayOfWeek,
      );
      if (idx === -1) return;
      this.daysFormArray.at(idx).patchValue({
        isOpen: h.isOpen,
        openTime: h.openTime,
        closeTime: h.closeTime,
        hasLunchBreak: !!(h.lunchStart && h.lunchEnd),
        lunchStart: h.lunchStart ?? '12:00',
        lunchEnd: h.lunchEnd ?? '13:00',
      });
    });

    this.form.markAsPristine();
  }

  private toDto(): EstablishmentConfig {
    const v = this.form.getRawValue();
    return {
      minDaysForOnlineUpdate: v.minDaysForOnlineUpdate!,
      businessHours: (v.businessHours as DayFormRawValue[]).map((d) => ({
        dayOfWeek: d.dayOfWeek!,
        isOpen: !!d.isOpen,
        openTime: d.openTime!,
        closeTime: d.closeTime!,
        lunchStart: d.hasLunchBreak ? (d.lunchStart ?? null) : null,
        lunchEnd: d.hasLunchBreak ? (d.lunchEnd ?? null) : null,
      })),
    };
  }
}

interface DayFormRawValue {
  dayOfWeek: number | null;
  isOpen: boolean | null;
  openTime: string | null;
  closeTime: string | null;
  hasLunchBreak: boolean | null;
  lunchStart: string | null;
  lunchEnd: string | null;
}
