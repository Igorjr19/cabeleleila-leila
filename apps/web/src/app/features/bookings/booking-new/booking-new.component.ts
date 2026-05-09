import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  BookingResponse,
  EstablishmentConfig,
  ServiceResponse,
} from '@cabeleleila/contracts';
import { DateTime } from 'luxon';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DatePickerModule } from 'primeng/datepicker';
import { DividerModule } from 'primeng/divider';
import { ListboxModule } from 'primeng/listbox';
import { MessageModule } from 'primeng/message';
import { StepsModule } from 'primeng/steps';
import { SALON_PHONE } from '../../../core/constants/establishment';
import { BookingApiService } from '../../../core/services/booking-api.service';
import { EstablishmentApiService } from '../../../core/services/establishment-api.service';
import { ServiceApiService } from '../../../core/services/service-api.service';
import { BrlCurrencyPipe } from '../../../shared/pipes/brl-currency.pipe';
import { SpDatetimePipe } from '../../../shared/pipes/sp-datetime.pipe';
import {
  addDays,
  isValidBusinessHour,
  toUtcISO,
} from '../../../shared/utils/date.utils';
import {
  BookingSuggestionDialogComponent,
  SameWeekChoice,
} from '../booking-suggestion-dialog/booking-suggestion-dialog.component';

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
                <span>{{ totalDuration }} min no total</span>
                <span class="font-bold text-primary">{{
                  totalPrice | brlCurrency
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

            @if (selectedDayHours(); as hours) {
              <p class="text-sm text-color-secondary m-0">
                @if (hours.isOpen) {
                  Atendimento {{ dayLabel(hours.dayOfWeek) }}:
                  {{ hours.openTime }}–{{ hours.closeTime }}
                  @if (hours.lunchStart && hours.lunchEnd) {
                    (almoço {{ hours.lunchStart }}–{{ hours.lunchEnd }})
                  }
                } @else {
                  Salão fechado em {{ dayLabel(hours.dayOfWeek) }}.
                }
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
              [loading]="checkingSameWeek()"
              [disabled]="!selectedDate || !!dateError()"
              (onClick)="advanceFromDateStep()"
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
                <span>Total ({{ totalDuration }} min)</span>
                <span class="text-primary">{{ totalPrice | brlCurrency }}</span>
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
        [existing]="sameWeekExisting()"
        [newServiceNames]="selectedServiceNames"
        (dismissed)="onSuggestionDismissed()"
        (decided)="onSuggestionDecision($event)"
      />
    </div>
  `,
})
export class BookingNewComponent implements OnInit {
  readonly router = inject(Router);
  private readonly serviceApi = inject(ServiceApiService);
  private readonly bookingApi = inject(BookingApiService);
  private readonly establishmentApi = inject(EstablishmentApiService);
  private readonly messageService = inject(MessageService);

  readonly services = toSignal(this.serviceApi.getServices());
  readonly config = signal<EstablishmentConfig | null>(null);
  readonly configError = signal(false);

  readonly activeStep = signal(0);
  readonly loading = signal(false);
  readonly checkingSameWeek = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly dateError = signal<string | null>(null);
  readonly suggestionVisible = signal(false);
  readonly sameWeekExisting = signal<BookingResponse | null>(null);

  selectedServices: ServiceResponse[] = [];
  selectedDate: Date | null = null;

  readonly minDate = computed(() => {
    const minDays = this.config()?.minDaysForOnlineUpdate ?? 2;
    return addDays(minDays);
  });

  readonly selectedDayHours = computed(() => {
    const cfg = this.config();
    const date = this.selectedDate;
    if (!cfg || !date) return null;
    const dt = DateTime.fromJSDate(date).setZone('America/Sao_Paulo', {
      keepLocalTime: true,
    });
    const dayOfWeek = dt.weekday % 7;
    return cfg.businessHours.find((h) => h.dayOfWeek === dayOfWeek) ?? null;
  });

  private readonly dayLabels = [
    'domingo',
    'segunda',
    'terça',
    'quarta',
    'quinta',
    'sexta',
    'sábado',
  ];

  dayLabel(dayOfWeek: number): string {
    return this.dayLabels[dayOfWeek] ?? '';
  }

  get totalPrice(): number {
    return this.selectedServices.reduce((s, sv) => s + sv.price, 0);
  }

  get totalDuration(): number {
    return this.selectedServices.reduce((s, sv) => s + sv.durationMinutes, 0);
  }

  get selectedServiceNames(): string[] {
    return this.selectedServices.map((s) => s.name);
  }

  readonly steps = [
    { label: 'Serviços' },
    { label: 'Data/Hora' },
    { label: 'Confirmação' },
  ];

  readonly toUtcISO = toUtcISO;
  readonly salonPhone = SALON_PHONE;

  ngOnInit(): void {
    this.establishmentApi.getConfig().subscribe({
      next: (cfg) => this.config.set(cfg),
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
    const result = isValidBusinessHour(dt, cfg.businessHours);
    this.dateError.set(
      result.valid ? null : (result.reason ?? 'Horário inválido'),
    );
  }

  advanceFromDateStep(): void {
    if (!this.selectedDate || this.dateError()) return;
    this.checkingSameWeek.set(true);

    this.bookingApi.checkSameWeek(toUtcISO(this.selectedDate)).subscribe({
      next: (existing) => {
        this.checkingSameWeek.set(false);
        if (existing) {
          this.sameWeekExisting.set(existing);
          this.suggestionVisible.set(true);
        } else {
          this.goToStep(2);
        }
      },
      error: () => {
        // If the check fails, don't block the flow — proceed to confirmation
        this.checkingSameWeek.set(false);
        this.goToStep(2);
      },
    });
  }

  onSuggestionDismissed(): void {
    this.suggestionVisible.set(false);
  }

  onSuggestionDecision(choice: SameWeekChoice): void {
    this.suggestionVisible.set(false);
    const existing = this.sameWeekExisting();

    if (choice === 'go-to-existing' && existing) {
      this.router.navigate(['/bookings', existing.id]);
      return;
    }

    if (choice === 'merge' && existing) {
      this.mergeIntoExisting(existing);
      return;
    }

    // 'keep-new' → continue with the new booking flow
    this.goToStep(2);
  }

  private mergeIntoExisting(existing: BookingResponse): void {
    const existingIds = existing.services.map((s) => s.id);
    const mergedIds = Array.from(
      new Set([...existingIds, ...this.selectedServices.map((s) => s.id)]),
    );

    this.loading.set(true);

    this.bookingApi
      .updateBooking(existing.id, { serviceIds: mergedIds })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Agendamento atualizado',
            detail:
              'Os novos serviços foram adicionados ao agendamento existente.',
          });
          this.router.navigate(['/bookings', existing.id]);
        },
        error: (err) => {
          this.loading.set(false);
          const msg: string =
            err.error?.message ??
            'Não foi possível adicionar os serviços ao agendamento existente.';
          this.messageService.add({
            severity: 'error',
            summary: 'Erro',
            detail: msg.toLowerCase().includes('antecedência')
              ? `${msg} Ligue: ${this.salonPhone}`
              : msg,
          });
          // Reopen the dialog so the user can choose another option
          this.suggestionVisible.set(true);
        },
      });
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
      next: () => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Agendamento criado',
          detail: 'Aguardando confirmação do salão.',
        });
        this.router.navigate(['/bookings']);
      },
      error: (err) => {
        this.loading.set(false);
        const msg: string = err.error?.message ?? 'Erro ao criar agendamento.';
        if (msg.toLowerCase().includes('antecedência')) {
          this.submitError.set(
            `${msg} Para datas mais próximas, ligue: ${this.salonPhone}`,
          );
        } else if (msg.toLowerCase().includes('horário indisponível')) {
          this.dateError.set(msg);
          this.goToStep(1);
        } else {
          this.submitError.set(msg);
        }
      },
    });
  }
}
