import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  AvailabilitySlot,
  BookingResponse,
  EstablishmentConfig,
  ServiceResponse,
} from '@cabeleleila/contracts';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { InputMaskModule } from 'primeng/inputmask';
import { InputTextModule } from 'primeng/inputtext';
import { ListboxModule } from 'primeng/listbox';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { StepsModule } from 'primeng/steps';
import { TooltipModule } from 'primeng/tooltip';
import { ServiceDetailDialogComponent } from '../../../shared/components/service-detail-dialog/service-detail-dialog.component';
import { SALON_PHONE } from '../../../core/constants/establishment';
import { AuthService } from '../../../core/services/auth.service';
import { BookingApiService } from '../../../core/services/booking-api.service';
import { EstablishmentApiService } from '../../../core/services/establishment-api.service';
import { ServiceApiService } from '../../../core/services/service-api.service';
import { SlotPickerComponent } from '../../../shared/components/slot-picker/slot-picker.component';
import { BrlCurrencyPipe } from '../../../shared/pipes/brl-currency.pipe';
import { SpDatetimePipe } from '../../../shared/pipes/sp-datetime.pipe';
import { addDays } from '../../../shared/utils/date.utils';
import {
  BookingSuggestionDialogComponent,
  SameWeekChoice,
} from '../booking-suggestion-dialog/booking-suggestion-dialog.component';

function passwordMatchValidator(
  control: AbstractControl,
): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirm = control.get('confirmPassword')?.value;
  return password === confirm ? null : { passwordMismatch: true };
}

const DAY_NAMES_LONG = [
  'domingos',
  'segundas-feiras',
  'terças-feiras',
  'quartas-feiras',
  'quintas-feiras',
  'sextas-feiras',
  'sábados',
];

@Component({
  selector: 'app-booking-new',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    StepsModule,
    ButtonModule,
    ListboxModule,
    CardModule,
    MessageModule,
    DividerModule,
    InputTextModule,
    InputMaskModule,
    PasswordModule,
    TooltipModule,
    SlotPickerComponent,
    ServiceDetailDialogComponent,
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
                  class="flex justify-content-between align-items-center w-full gap-2"
                >
                  <span>{{ service.name }}</span>
                  <div class="flex align-items-center gap-2">
                    <span class="text-color-secondary text-sm"
                      >{{ service.durationMinutes }} min</span
                    >
                    <span class="font-bold text-primary">{{
                      service.price | brlCurrency
                    }}</span>
                    <p-button
                      icon="pi pi-info-circle"
                      text
                      rounded
                      size="small"
                      pTooltip="Ver detalhes"
                      tooltipPosition="left"
                      (onClick)="openServiceDetail($event, service)"
                    />
                  </div>
                </div>
              </ng-template>
            </p-listbox>

            <app-service-detail-dialog
              [visible]="serviceDetailVisible()"
              [service]="serviceDetail()"
              (dismissed)="closeServiceDetail()"
            />

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

      <!-- Step 2: Slot picker -->
      @if (activeStep() === 1) {
        <p-card header="Escolha data e horário">
          @if (configError()) {
            <p-message
              severity="warn"
              text="Não foi possível carregar as restrições de horário."
              styleClass="mb-3"
            />
          }

          <app-slot-picker
            [durationMinutes]="totalDuration"
            [minDate]="minDate()"
            [closedDays]="closedDays()"
            [closedDayLabels]="closedDayLabels()"
            (slotChange)="selectedSlot.set($event)"
          />

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

          @if (!isAuthenticated()) {
            <p-divider />

            <div class="flex flex-column gap-3">
              <div>
                <p class="text-sm font-semibold text-color-secondary m-0 mb-1">
                  IDENTIFICAÇÃO
                </p>
                <p class="text-color-secondary text-sm m-0">
                  Para confirmar, conte rapidinho quem é você. Levamos menos de
                  1 minuto.
                </p>
              </div>

              <form
                [formGroup]="signupForm"
                class="flex flex-column gap-3"
                (ngSubmit)="submit()"
              >
                <div class="flex flex-column gap-1">
                  <label>Nome completo</label>
                  <input
                    pInputText
                    formControlName="name"
                    placeholder="Maria Silva"
                    class="w-full"
                  />
                </div>
                <div class="flex flex-column gap-1">
                  <label>E-mail</label>
                  <input
                    type="email"
                    pInputText
                    formControlName="email"
                    placeholder="seu@email.com"
                    class="w-full"
                  />
                </div>
                <div class="flex flex-column gap-1">
                  <label>Telefone</label>
                  <p-inputmask
                    formControlName="phone"
                    mask="(99) 99999-9999"
                    placeholder="(11) 99999-9999"
                    styleClass="w-full"
                  />
                </div>
                <div class="flex flex-column gap-1">
                  <label>Senha</label>
                  <p-password
                    formControlName="password"
                    [toggleMask]="true"
                    placeholder="Mínimo 6 caracteres"
                    styleClass="w-full"
                    inputStyleClass="w-full"
                  />
                </div>
                <div class="flex flex-column gap-1">
                  <label>Confirmar senha</label>
                  <p-password
                    formControlName="confirmPassword"
                    [feedback]="false"
                    [toggleMask]="true"
                    placeholder="Repita a senha"
                    styleClass="w-full"
                    inputStyleClass="w-full"
                  />
                  @if (
                    signupForm.hasError('passwordMismatch') &&
                    signupForm.get('confirmPassword')?.touched
                  ) {
                    <small class="p-error">As senhas não coincidem.</small>
                  }
                </div>

                <p class="text-sm text-color-secondary m-0">
                  Já tem conta?
                  <a
                    [routerLink]="['/auth/login']"
                    [queryParams]="{ returnUrl: '/bookings/new' }"
                  >
                    Entrar
                  </a>
                </p>
              </form>
            </div>
          }

          <div class="flex justify-content-between mt-4">
            <p-button
              label="Voltar"
              severity="secondary"
              (onClick)="goToStep(1)"
            />
            <p-button
              [label]="
                isAuthenticated() ? 'Confirmar' : 'Criar conta e confirmar'
              "
              icon="pi pi-check"
              [loading]="loading()"
              [disabled]="!isAuthenticated() && signupForm.invalid"
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
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly isAuthenticated = this.auth.isAuthenticated;

  readonly signupForm = this.fb.group(
    {
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordMatchValidator },
  );

  readonly services = toSignal(this.serviceApi.getServices());
  readonly config = signal<EstablishmentConfig | null>(null);
  readonly configError = signal(false);

  readonly activeStep = signal(0);
  readonly loading = signal(false);
  readonly checkingSameWeek = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly suggestionVisible = signal(false);
  readonly sameWeekExisting = signal<BookingResponse | null>(null);

  readonly selectedSlot = signal<AvailabilitySlot | null>(null);
  readonly serviceDetail = signal<ServiceResponse | null>(null);
  readonly serviceDetailVisible = signal(false);

  selectedServices: ServiceResponse[] = [];

  readonly minDate = computed(() => {
    const minDays = this.config()?.minDaysForOnlineUpdate ?? 2;
    return addDays(minDays);
  });

  readonly closedDays = computed(() => {
    const cfg = this.config();
    if (!cfg) return [];
    return cfg.businessHours.filter((h) => !h.isOpen).map((h) => h.dayOfWeek);
  });

  readonly closedDayLabels = computed(() =>
    this.closedDays().map((d) => DAY_NAMES_LONG[d]),
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

  openServiceDetail(event: Event, service: ServiceResponse): void {
    event.stopPropagation();
    this.serviceDetail.set(service);
    this.serviceDetailVisible.set(true);
  }

  closeServiceDetail(): void {
    this.serviceDetailVisible.set(false);
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

    if (!this.isAuthenticated()) {
      if (this.signupForm.invalid) {
        this.signupForm.markAllAsTouched();
        return;
      }
      this.loading.set(true);
      this.submitError.set(null);

      const { name, email, phone, password } = this.signupForm.getRawValue();
      this.auth.register(name!, email!, phone!, password!).subscribe({
        next: () => this.createBooking(slot),
        error: (err) => {
          this.loading.set(false);
          const msg: string =
            err.error?.message ??
            'Erro ao criar conta. Tente outro e-mail ou faça login.';
          this.submitError.set(msg);
        },
      });
      return;
    }

    this.loading.set(true);
    this.submitError.set(null);
    this.createBooking(slot);
  }

  private createBooking(slot: AvailabilitySlot): void {
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
          this.submitError.set(`${msg} Volte e selecione outro horário.`);
          this.selectedSlot.set(null);
          this.goToStep(1);
        } else {
          this.submitError.set(msg);
        }
      },
    });
  }
}
