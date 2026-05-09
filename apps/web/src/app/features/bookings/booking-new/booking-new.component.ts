import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  AvailabilityResponse,
  AvailabilitySlot,
  BookingResponse,
  EstablishmentConfig,
  ServiceResponse,
  SlotUnavailableReason,
} from '@cabeleleila/contracts';
import { DateTime } from 'luxon';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DatePickerModule } from 'primeng/datepicker';
import { DividerModule } from 'primeng/divider';
import { ListboxModule } from 'primeng/listbox';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { StepsModule } from 'primeng/steps';
import { TooltipModule } from 'primeng/tooltip';
import { SALON_PHONE } from '../../../core/constants/establishment';
import { BookingApiService } from '../../../core/services/booking-api.service';
import { EstablishmentApiService } from '../../../core/services/establishment-api.service';
import { ServiceApiService } from '../../../core/services/service-api.service';
import { BrlCurrencyPipe } from '../../../shared/pipes/brl-currency.pipe';
import { SpDatetimePipe } from '../../../shared/pipes/sp-datetime.pipe';
import { addDays } from '../../../shared/utils/date.utils';
import {
  BookingSuggestionDialogComponent,
  SameWeekChoice,
} from '../booking-suggestion-dialog/booking-suggestion-dialog.component';

const REASON_TOOLTIP: Record<SlotUnavailableReason, string> = {
  PAST: 'Horário já passou',
  TOO_SOON: 'Antecedência mínima não atendida — ligue para o salão',
  LUNCH: 'Conflita com o horário de almoço',
  OCCUPIED: 'Já existe agendamento neste horário',
  CLOSING: 'O serviço terminaria depois do fechamento',
  CLOSED: 'Salão fechado',
  BLOCKED: 'Salão indisponível neste horário',
};

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
    SkeletonModule,
    TooltipModule,
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

      <!-- Step 2: Date & Slot Selection -->
      @if (activeStep() === 1) {
        <p-card header="Escolha data e horário">
          @if (configError()) {
            <p-message
              severity="warn"
              text="Não foi possível carregar as restrições de horário."
              styleClass="mb-3"
            />
          }

          <div class="flex flex-column gap-3">
            <div class="flex flex-column gap-1">
              <label class="font-medium">Data</label>
              <p-datepicker
                [(ngModel)]="selectedDay"
                [minDate]="minDate()"
                [disabledDays]="closedDays()"
                [showButtonBar]="true"
                placeholder="Selecione uma data"
                styleClass="w-full"
                (onSelect)="onDayPicked()"
                (onClear)="onDayCleared()"
              />
              @if (closedDayLabels().length > 0) {
                <small class="text-color-secondary">
                  Salão fechado:
                  {{ closedDayLabels().join(', ') }}.
                </small>
              }
            </div>

            @if (loadingAvailability()) {
              <div class="grid">
                @for (i of skeletonRows; track $index) {
                  <div class="col-4 md:col-3 lg:col-2">
                    <p-skeleton height="2.5rem" />
                  </div>
                }
              </div>
            }
            @if (!loadingAvailability() && availability(); as av) {
              @if (!av.isOpen) {
                <p-message
                  severity="info"
                  text="Salão fechado neste dia. Escolha outra data."
                />
              } @else if (av.slots.length === 0) {
                <p-message
                  severity="warn"
                  text="O total de serviços selecionados é maior que a janela de funcionamento. Reduza serviços ou escolha outro dia."
                />
              } @else {
                <div class="flex flex-column gap-2">
                  <div
                    class="flex justify-content-between align-items-center flex-wrap gap-2"
                  >
                    <span class="text-sm text-color-secondary">
                      Atendimento: {{ av.openTime }}–{{ av.closeTime }}
                      @if (av.lunchStart && av.lunchEnd) {
                        (almoço {{ av.lunchStart }}–{{ av.lunchEnd }})
                      }
                    </span>
                    <span class="text-sm text-color-secondary">
                      {{ totalDuration }} min
                    </span>
                  </div>

                  @if (!hasAnyAvailable(av.slots)) {
                    <p-message
                      severity="warn"
                      text="Sem horários disponíveis neste dia. Tente outra data."
                    />
                  }

                  <div class="grid">
                    @for (slot of av.slots; track slot.startsAt) {
                      <div class="col-4 md:col-3 lg:col-2">
                        <p-button
                          [label]="slot.time"
                          severity="primary"
                          [outlined]="!isSlotSelected(slot)"
                          [disabled]="!slot.available"
                          [pTooltip]="slotTooltip(slot)"
                          tooltipPosition="top"
                          styleClass="w-full"
                          (onClick)="pickSlot(slot)"
                        />
                      </div>
                    }
                  </div>

                  <div class="flex flex-wrap gap-3 mt-1 align-items-center">
                    <span
                      class="flex align-items-center gap-2 text-xs text-color-secondary"
                    >
                      <p-button
                        label="hh:mm"
                        severity="primary"
                        outlined
                        size="small"
                        [styleClass]="'pointer-events-none'"
                      />
                      Disponível
                    </span>
                    <span
                      class="flex align-items-center gap-2 text-xs text-color-secondary"
                    >
                      <p-button
                        label="hh:mm"
                        severity="primary"
                        outlined
                        disabled
                        size="small"
                        [styleClass]="'pointer-events-none'"
                      />
                      Indisponível (passe o mouse para ver o motivo)
                    </span>
                  </div>
                </div>
              }
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
              [disabled]="!selectedSlot()"
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
                {{ selectedSlot()?.startsAt | spDatetime }}
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
  readonly suggestionVisible = signal(false);
  readonly sameWeekExisting = signal<BookingResponse | null>(null);

  readonly availability = signal<AvailabilityResponse | null>(null);
  readonly loadingAvailability = signal(false);
  readonly selectedSlot = signal<AvailabilitySlot | null>(null);

  selectedServices: ServiceResponse[] = [];
  selectedDay: Date | null = null;

  readonly skeletonRows = Array.from({ length: 12 });

  readonly minDate = computed(() => {
    const minDays = this.config()?.minDaysForOnlineUpdate ?? 2;
    return addDays(minDays);
  });

  readonly closedDays = computed(() => {
    const cfg = this.config();
    if (!cfg) return [];
    return cfg.businessHours.filter((h) => !h.isOpen).map((h) => h.dayOfWeek);
  });

  private readonly DAY_NAMES_LONG = [
    'domingos',
    'segundas-feiras',
    'terças-feiras',
    'quartas-feiras',
    'quintas-feiras',
    'sextas-feiras',
    'sábados',
  ];

  readonly closedDayLabels = computed(() =>
    this.closedDays().map((d) => this.DAY_NAMES_LONG[d]),
  );

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

  onDayPicked(): void {
    this.selectedSlot.set(null);
    if (!this.selectedDay) {
      this.availability.set(null);
      return;
    }
    this.loadAvailability();
  }

  onDayCleared(): void {
    this.selectedDay = null;
    this.selectedSlot.set(null);
    this.availability.set(null);
  }

  private loadAvailability(): void {
    if (!this.selectedDay) return;
    const isoDate = DateTime.fromJSDate(this.selectedDay).toFormat(
      'yyyy-MM-dd',
    );
    this.loadingAvailability.set(true);
    this.availability.set(null);

    this.bookingApi.getAvailability(isoDate, this.totalDuration).subscribe({
      next: (res) => {
        this.loadingAvailability.set(false);
        this.availability.set(res);
      },
      error: (err) => {
        this.loadingAvailability.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail:
            err.error?.message ?? 'Não foi possível carregar os horários.',
        });
      },
    });
  }

  hasAnyAvailable(slots: AvailabilitySlot[]): boolean {
    return slots.some((s) => s.available);
  }

  pickSlot(slot: AvailabilitySlot): void {
    if (!slot.available) return;
    this.selectedSlot.set(slot);
  }

  isSlotSelected(slot: AvailabilitySlot): boolean {
    return this.selectedSlot()?.startsAt === slot.startsAt;
  }

  slotTooltip(slot: AvailabilitySlot): string {
    if (slot.available) return '';
    return slot.reason ? REASON_TOOLTIP[slot.reason] : 'Indisponível';
  }

  advanceFromDateStep(): void {
    const slot = this.selectedSlot();
    if (!slot) return;
    this.checkingSameWeek.set(true);

    this.bookingApi.checkSameWeek(slot.startsAt).subscribe({
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
          this.suggestionVisible.set(true);
        },
      });
  }

  submit(): void {
    const slot = this.selectedSlot();
    if (!slot || this.selectedServices.length === 0) return;

    this.loading.set(true);
    this.submitError.set(null);

    const dto = {
      serviceIds: this.selectedServices.map((s) => s.id),
      scheduledAt: slot.startsAt,
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
        } else if (
          msg.toLowerCase().includes('horário indisponível') ||
          msg.toLowerCase().includes('funcionamento') ||
          msg.toLowerCase().includes('almoço')
        ) {
          // Slot was taken between our check and submit, or somehow invalid — refresh slots
          this.submitError.set(`${msg} Atualizando horários...`);
          this.selectedSlot.set(null);
          this.loadAvailability();
          this.goToStep(1);
        } else {
          this.submitError.set(msg);
        }
      },
    });
  }
}
