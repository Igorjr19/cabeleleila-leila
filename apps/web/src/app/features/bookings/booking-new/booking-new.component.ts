import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { DateTime } from 'luxon';
import { StepsModule } from 'primeng/steps';
import { ButtonModule } from 'primeng/button';
import { ListboxModule } from 'primeng/listbox';
import { DatePickerModule } from 'primeng/datepicker';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { DividerModule } from 'primeng/divider';
import { ServiceResponse } from '@cabeleleila/contracts';
import { ServiceApiService } from '../../../core/services/service-api.service';
import { BookingApiService } from '../../../core/services/booking-api.service';
import {
  EstablishmentApiService,
  EstablishmentConfig,
} from '../../../core/services/establishment-api.service';
import { BrlCurrencyPipe } from '../../../shared/pipes/brl-currency.pipe';
import { SpDatetimePipe } from '../../../shared/pipes/sp-datetime.pipe';
import {
  addDays,
  isValidBusinessHour,
  toUtcISO,
} from '../../../shared/utils/date.utils';
import { BookingSuggestionDialogComponent } from '../booking-suggestion-dialog/booking-suggestion-dialog.component';
import { BookingSuggestion } from '@cabeleleila/contracts';
import { SALON_PHONE } from '../../../core/constants/establishment';

@Component({
  selector: 'app-booking-new',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    StepsModule,
    ButtonModule,
    ListboxModule,
    DatePickerModule,
    CardModule,
    MessageModule,
    DividerModule,
    BrlCurrencyPipe,
    SpDatetimePipe,
    BookingSuggestionDialogComponent,
  ],
  template: `
    <div class="max-w-2xl mx-auto">
      <div class="flex align-items-center gap-2 mb-4">
        <p-button
          icon="pi pi-arrow-left"
          text
          (onClick)="router.navigate(['/bookings'])"
        />
        <h2 class="m-0">Novo Agendamento</h2>
      </div>

      <p-steps
        [model]="steps"
        [activeIndex]="activeStep()"
        [readonly]="true"
        styleClass="mb-4"
      />

      <!-- Step 1: Service Selection -->
      @if (activeStep() === 0) {
        <p-card header="Selecione os serviços">
          @if (!services()) {
            <p class="text-color-secondary">Carregando serviços...</p>
          } @else {
            <p-listbox
              [options]="services()!"
              [multiple]="true"
              [(ngModel)]="selectedServices"
              optionLabel="name"
              [listStyle]="{ 'max-height': '300px' }"
              styleClass="w-full"
            >
              <ng-template pTemplate="option" let-service>
                <div
                  class="flex justify-content-between align-items-center w-full"
                >
                  <span>{{ service.name }}</span>
                  <div class="flex align-items-center gap-2">
                    <span class="text-color-secondary text-sm"
                      >{{ service.durationMinutes }} min</span
                    >
                    <span class="font-bold text-primary">{{
                      service.price | brlCurrency
                    }}</span>
                  </div>
                </div>
              </ng-template>
            </p-listbox>

            @if (selectedServices.length > 0) {
              <p-divider />
              <div
                class="flex justify-content-between text-sm text-color-secondary"
              >
                <span>{{ totalDuration() }} min no total</span>
                <span class="font-bold text-primary">{{
                  totalPrice() | brlCurrency
                }}</span>
              </div>
            }
          }

          <div class="flex justify-content-end mt-3">
            <p-button
              label="Próximo"
              icon="pi pi-arrow-right"
              iconPos="right"
              [disabled]="selectedServices.length === 0"
              (onClick)="goToStep(1)"
            />
          </div>
        </p-card>
      }

      <!-- Step 2: Date & Time -->
      @if (activeStep() === 1) {
        <p-card header="Escolha data e horário">
          @if (configError()) {
            <p-message
              severity="warn"
              text="Não foi possível carregar as restrições de horário. Verifique com o salão."
              styleClass="mb-3"
            />
          }

          <div class="flex flex-column gap-3">
            <div class="flex flex-column gap-1">
              <label>Data e horário</label>
              <p-datepicker
                [(ngModel)]="selectedDate"
                [showTime]="true"
                [minDate]="minDate()"
                [hourFormat]="'24'"
                [showButtonBar]="true"
                placeholder="Selecione data e horário"
                styleClass="w-full"
                (onSelect)="validateDate()"
              />
            </div>

            @if (dateError()) {
              <p-message severity="error" [text]="dateError()!" />
            }

            @if (config()) {
              <p class="text-sm text-color-secondary m-0">
                Horário de atendimento: {{ config()!.business_hours.open }}–{{
                  config()!.business_hours.close
                }}
                (almoço {{ config()!.business_hours.lunchStart }}–{{
                  config()!.business_hours.lunchEnd
                }})
              </p>
            }
          </div>

          <div class="flex justify-content-between mt-3">
            <p-button
              label="Voltar"
              severity="secondary"
              (onClick)="goToStep(0)"
            />
            <p-button
              label="Próximo"
              icon="pi pi-arrow-right"
              iconPos="right"
              [disabled]="!selectedDate || !!dateError()"
              (onClick)="goToStep(2)"
            />
          </div>
        </p-card>
      }

      <!-- Step 3: Confirmation -->
      @if (activeStep() === 2) {
        <p-card header="Confirmar agendamento">
          @if (submitError()) {
            <p-message
              severity="error"
              [text]="submitError()!"
              styleClass="mb-3"
            />
          }

          <div class="flex flex-column gap-3">
            <div>
              <p class="text-sm font-semibold text-color-secondary m-0 mb-1">
                SERVIÇOS
              </p>
              @for (s of selectedServices; track s.id) {
                <div class="flex justify-content-between py-1">
                  <span>{{ s.name }}</span>
                  <span class="text-primary font-semibold">{{
                    s.price | brlCurrency
                  }}</span>
                </div>
              }
              <p-divider />
              <div class="flex justify-content-between font-bold">
                <span>Total ({{ totalDuration() }} min)</span>
                <span class="text-primary">{{
                  totalPrice() | brlCurrency
                }}</span>
              </div>
            </div>

            <div>
              <p class="text-sm font-semibold text-color-secondary m-0 mb-1">
                DATA E HORÁRIO
              </p>
              <p class="m-0 text-lg">
                {{ selectedDate ? (toUtcISO(selectedDate) | spDatetime) : '—' }}
              </p>
            </div>
          </div>

          <div class="flex justify-content-between mt-4">
            <p-button
              label="Voltar"
              severity="secondary"
              (onClick)="goToStep(1)"
            />
            <p-button
              label="Confirmar"
              icon="pi pi-check"
              [loading]="loading()"
              (onClick)="submit()"
            />
          </div>
        </p-card>
      }

      <app-booking-suggestion-dialog
        [visible]="suggestionVisible()"
        [suggestion]="suggestion()"
        (dismissed)="onSuggestionDismissed()"
        (viewExisting)="onViewExisting($event)"
      />
    </div>
  `,
})
export class BookingNewComponent implements OnInit {
  readonly router = inject(Router);
  private readonly serviceApi = inject(ServiceApiService);
  private readonly bookingApi = inject(BookingApiService);
  private readonly establishmentApi = inject(EstablishmentApiService);

  readonly services = toSignal(this.serviceApi.getServices());
  readonly config = signal<EstablishmentConfig | null>(null);
  readonly configError = signal(false);

  readonly activeStep = signal(0);
  readonly loading = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly dateError = signal<string | null>(null);
  readonly suggestionVisible = signal(false);
  readonly suggestion = signal<BookingSuggestion | null>(null);

  selectedServices: ServiceResponse[] = [];
  selectedDate: Date | null = null;

  readonly minDate = computed(() => {
    const minDays = this.config()?.min_days_for_online_update ?? 2;
    return addDays(minDays);
  });

  readonly totalPrice = computed(() =>
    this.selectedServices.reduce((s, sv) => s + sv.price, 0),
  );
  readonly totalDuration = computed(() =>
    this.selectedServices.reduce((s, sv) => s + sv.durationMinutes, 0),
  );

  readonly steps = [
    { label: 'Serviços' },
    { label: 'Data/Hora' },
    { label: 'Confirmação' },
  ];

  readonly toUtcISO = toUtcISO;
  readonly salonPhone = SALON_PHONE;

  ngOnInit(): void {
    this.establishmentApi.getConfig().subscribe({
      next: (res) => this.config.set(res.config),
      error: () => this.configError.set(true),
    });
  }

  goToStep(step: number): void {
    this.activeStep.set(step);
  }

  validateDate(): void {
    if (!this.selectedDate) return;
    const cfg = this.config();
    if (!cfg) return;

    const dt = DateTime.fromJSDate(this.selectedDate).setZone(
      'America/Sao_Paulo',
      { keepLocalTime: true },
    );
    const result = isValidBusinessHour(dt, cfg.business_hours);
    this.dateError.set(
      result.valid ? null : (result.reason ?? 'Horário inválido'),
    );
  }

  submit(): void {
    if (!this.selectedDate || this.selectedServices.length === 0) return;
    this.loading.set(true);
    this.submitError.set(null);

    const dto = {
      serviceIds: this.selectedServices.map((s) => s.id),
      scheduledAt: toUtcISO(this.selectedDate),
    };

    this.bookingApi.createBooking(dto).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.suggestion?.hasSameWeekBooking) {
          this.suggestion.set(res.suggestion);
          this.suggestionVisible.set(true);
        } else {
          this.router.navigate(['/bookings']);
        }
      },
      error: (err) => {
        this.loading.set(false);
        const msg: string = err.error?.message ?? 'Erro ao criar agendamento.';
        if (
          msg.toLowerCase().includes('dias de antecedência') ||
          msg.toLowerCase().includes('antecedência')
        ) {
          this.submitError.set(
            `${msg} Para datas mais próximas, ligue: ${this.salonPhone}`,
          );
        } else {
          this.submitError.set(msg);
        }
      },
    });
  }

  onSuggestionDismissed(): void {
    this.suggestionVisible.set(false);
    this.router.navigate(['/bookings']);
  }

  onViewExisting(id: string): void {
    this.suggestionVisible.set(false);
    this.router.navigate(['/bookings', id]);
  }
}
