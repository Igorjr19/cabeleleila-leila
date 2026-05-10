import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AvailabilitySlot,
  BookingResponse,
  BookingServiceStatus,
  BookingStatus,
  EstablishmentConfig,
  ServiceResponse,
} from '@cabeleleila/contracts';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DividerModule } from 'primeng/divider';
import { ListboxModule } from 'primeng/listbox';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { SALON_PHONE } from '../../../core/constants/establishment';
import { AuthService } from '../../../core/services/auth.service';
import { BookingApiService } from '../../../core/services/booking-api.service';
import { EstablishmentApiService } from '../../../core/services/establishment-api.service';
import { ServiceApiService } from '../../../core/services/service-api.service';
import { SlotPickerComponent } from '../../../shared/components/slot-picker/slot-picker.component';
import { BrlCurrencyPipe } from '../../../shared/pipes/brl-currency.pipe';
import { SpDatetimePipe } from '../../../shared/pipes/sp-datetime.pipe';
import { addDays } from '../../../shared/utils/date.utils';

const DAY_NAMES_LONG = [
  'domingos',
  'segundas-feiras',
  'terças-feiras',
  'quartas-feiras',
  'quintas-feiras',
  'sextas-feiras',
  'sábados',
];

type EditMode = 'date' | 'services' | null;

const STATUS_LABELS: Record<BookingStatus, string> = {
  [BookingStatus.PENDING]: 'Pendente',
  [BookingStatus.CONFIRMED]: 'Confirmado',
  [BookingStatus.CANCELLED]: 'Cancelado',
  [BookingStatus.FINISHED]: 'Finalizado',
};

const STATUS_SEVERITY: Record<BookingStatus, string> = {
  [BookingStatus.PENDING]: 'warn',
  [BookingStatus.CONFIRMED]: 'success',
  [BookingStatus.CANCELLED]: 'danger',
  [BookingStatus.FINISHED]: 'secondary',
};

const SERVICE_STATUS_LABELS: Record<BookingServiceStatus, string> = {
  [BookingServiceStatus.PENDING]: 'Aguardando análise',
  [BookingServiceStatus.CONFIRMED]: 'Confirmado',
  [BookingServiceStatus.DECLINED]: 'Recusado',
};

const SERVICE_STATUS_SEVERITY: Record<BookingServiceStatus, string> = {
  [BookingServiceStatus.PENDING]: 'warn',
  [BookingServiceStatus.CONFIRMED]: 'success',
  [BookingServiceStatus.DECLINED]: 'danger',
};

@Component({
  selector: 'app-booking-detail',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    TagModule,
    MessageModule,
    ConfirmDialogModule,
    DividerModule,
    ListboxModule,
    TooltipModule,
    SlotPickerComponent,
    SpDatetimePipe,
    BrlCurrencyPipe,
  ],
  template: `
    <div class="max-w-2xl mx-auto">
      <div class="flex align-items-center gap-2 mb-4">
        <p-button
          icon="pi pi-arrow-left"
          text
          (onClick)="
            router.navigate([isAdmin() ? '/admin/bookings' : '/bookings'])
          "
        />
        <h2 class="m-0">Detalhes do Agendamento</h2>
      </div>

      @if (loading()) {
        <p class="text-color-secondary">Carregando...</p>
      } @else if (booking()) {
        <p-card>
          <div class="flex flex-column gap-3">
            <!-- Status -->
            <div class="flex justify-content-between align-items-center">
              <span class="text-sm text-color-secondary">STATUS</span>
              <p-tag
                [value]="statusLabel(booking()!.status)"
                [severity]="statusSeverity(booking()!.status)"
              />
            </div>

            @if (isAdmin()) {
              <div class="flex justify-content-between align-items-center">
                <span class="text-sm text-color-secondary">CLIENTE</span>
                <span class="font-medium">{{ booking()!.customerName }}</span>
              </div>
            }

            <p-divider styleClass="my-1" />

            <!-- Date -->
            <div>
              <p class="text-sm text-color-secondary m-0 mb-1">
                DATA E HORÁRIO
              </p>
              <p class="text-xl font-semibold m-0">
                {{ booking()!.scheduledAt | spDatetime }}
              </p>
            </div>

            <!-- Services -->
            <div>
              <p class="text-sm text-color-secondary m-0 mb-2">SERVIÇOS</p>
              <div class="flex flex-column gap-2">
                @for (s of booking()!.services; track s.id) {
                  <div
                    class="surface-50 border-round p-2 flex flex-column gap-2"
                  >
                    <div
                      class="flex justify-content-between align-items-center gap-2 flex-wrap"
                    >
                      <span class="font-medium">{{ s.name }}</span>
                      <span class="font-semibold">{{
                        s.price | brlCurrency
                      }}</span>
                    </div>

                    <div class="flex align-items-center gap-2 flex-wrap">
                      <p-tag
                        [value]="serviceStatusLabel(s.status)"
                        [severity]="serviceStatusSeverity(s.status)"
                      />

                      @if (
                        isAdmin() &&
                        canDecideService(s.status) &&
                        booking()!.status === 'PENDING'
                      ) {
                        <p-button
                          icon="pi pi-check"
                          label="Confirmar"
                          severity="success"
                          size="small"
                          (onClick)="
                            decideService(
                              s.id,
                              BookingServiceStatusEnum.CONFIRMED
                            )
                          "
                        />
                        <p-button
                          icon="pi pi-times"
                          label="Recusar"
                          severity="danger"
                          outlined
                          size="small"
                          (onClick)="
                            decideService(
                              s.id,
                              BookingServiceStatusEnum.DECLINED
                            )
                          "
                        />
                      }
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Error -->
            @if (actionError()) {
              <p-message severity="error" [text]="actionError()!" />
            }

            <!-- Edit: date -->
            @if (editMode() === 'date') {
              <p-divider />
              <div class="flex flex-column gap-2">
                <label class="font-semibold">Nova data e horário</label>
                <app-slot-picker
                  [durationMinutes]="bookingDuration()"
                  [minDate]="minDate"
                  [closedDays]="closedDays()"
                  [closedDayLabels]="closedDayLabels()"
                  [initialScheduledAt]="booking()?.scheduledAt ?? null"
                  [excludeBookingId]="booking()?.id ?? null"
                  (slotChange)="newSlot.set($event)"
                />
                <div class="flex gap-2 justify-content-end">
                  <p-button
                    label="Cancelar"
                    severity="secondary"
                    (onClick)="cancelEdit()"
                  />
                  <p-button
                    label="Salvar"
                    [loading]="saving()"
                    [disabled]="!newSlot()"
                    (onClick)="saveDate()"
                  />
                </div>
              </div>
            }

            <!-- Edit: services -->
            @if (editMode() === 'services') {
              <p-divider />
              <div class="flex flex-column gap-2">
                <label class="font-semibold">Editar serviços</label>
                @if (allServices()) {
                  <p-listbox
                    [options]="allServices()!"
                    [multiple]="true"
                    [(ngModel)]="editingServices"
                    optionLabel="name"
                    [listStyle]="{ 'max-height': '260px' }"
                    styleClass="w-full"
                  >
                    <ng-template pTemplate="option" let-svc>
                      <div
                        class="flex justify-content-between align-items-center w-full"
                      >
                        <span>{{ svc.name }}</span>
                        <div class="flex align-items-center gap-2">
                          <span class="text-color-secondary text-sm">
                            {{ svc.durationMinutes }} min
                          </span>
                          <span class="font-bold text-primary">
                            {{ svc.price | brlCurrency }}
                          </span>
                        </div>
                      </div>
                    </ng-template>
                  </p-listbox>
                } @else {
                  <p class="text-color-secondary">Carregando serviços...</p>
                }

                @if (editingServices.length > 0) {
                  <div
                    class="flex justify-content-between text-sm text-color-secondary"
                  >
                    <span>{{ editingDuration }} min no total</span>
                    <span class="font-bold text-primary">
                      {{ editingTotalPrice | brlCurrency }}
                    </span>
                  </div>
                }

                @if (servicesError()) {
                  <small class="p-error">{{ servicesError() }}</small>
                }

                <div class="flex gap-2 justify-content-end">
                  <p-button
                    label="Cancelar"
                    severity="secondary"
                    (onClick)="cancelEdit()"
                  />
                  <p-button
                    label="Salvar"
                    [loading]="saving()"
                    [disabled]="editingServices.length === 0"
                    (onClick)="saveServices()"
                  />
                </div>
              </div>
            }

            <!-- Actions -->
            @if (editMode() === null && canEdit(booking()!)) {
              <p-divider />
              <div class="flex gap-2 flex-wrap">
                @if (isAdmin() && booking()!.status === 'PENDING') {
                  <p-button
                    label="Confirmar agendamento"
                    icon="pi pi-check"
                    severity="success"
                    [loading]="transitioning()"
                    [disabled]="!allServicesDecided()"
                    [pTooltip]="
                      allServicesDecided()
                        ? ''
                        : 'Confirme ou recuse cada serviço solicitado antes de confirmar o agendamento.'
                    "
                    tooltipPosition="top"
                    (onClick)="confirmBooking()"
                  />
                }
                @if (isAdmin() && booking()!.status === 'CONFIRMED') {
                  <p-button
                    label="Finalizar agendamento"
                    icon="pi pi-flag-fill"
                    severity="secondary"
                    [loading]="transitioning()"
                    (onClick)="confirmFinish()"
                  />
                }
                <p-button
                  label="Editar serviços"
                  icon="pi pi-list"
                  severity="secondary"
                  text
                  [disabled]="!canEditServices()"
                  [pTooltip]="
                    canEditServices()
                      ? ''
                      : 'Algum serviço já foi iniciado ou concluído pelo salão. Para alterações, ligue para o salão.'
                  "
                  tooltipPosition="top"
                  (onClick)="startEditServices()"
                />
                <p-button
                  label="Editar horário"
                  icon="pi pi-pencil"
                  severity="secondary"
                  text
                  (onClick)="startEditDate()"
                />
                <p-button
                  label="Cancelar agendamento"
                  icon="pi pi-times"
                  severity="danger"
                  text
                  (onClick)="confirmCancel()"
                />
              </div>
            }
          </div>
        </p-card>
      }
    </div>
  `,
})
export class BookingDetailComponent implements OnInit {
  readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly bookingApi = inject(BookingApiService);
  private readonly establishmentApi = inject(EstablishmentApiService);
  private readonly serviceApi = inject(ServiceApiService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly transitioning = signal(false);
  readonly booking = signal<BookingResponse | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly editMode = signal<EditMode>(null);
  readonly servicesError = signal<string | null>(null);
  readonly allServices = signal<ServiceResponse[] | null>(null);
  readonly config = signal<EstablishmentConfig | null>(null);
  readonly newSlot = signal<AvailabilitySlot | null>(null);

  readonly isAdmin = this.auth.isAdmin;
  readonly BookingServiceStatusEnum = BookingServiceStatus;

  readonly bookingDuration = computed(
    () =>
      this.booking()?.services.reduce((sum, s) => sum + s.durationMinutes, 0) ??
      0,
  );

  readonly closedDays = computed(() => {
    const cfg = this.config();
    if (!cfg) return [];
    return cfg.businessHours.filter((h) => !h.isOpen).map((h) => h.dayOfWeek);
  });

  readonly closedDayLabels = computed(() =>
    this.closedDays().map((d) => DAY_NAMES_LONG[d]),
  );

  editingServices: ServiceResponse[] = [];
  minDate = addDays(2);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.bookingApi.getBookingById(id).subscribe({
      next: (b) => {
        this.booking.set(b);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.router.navigate(['/bookings']);
      },
    });
    this.establishmentApi.getConfig().subscribe({
      next: (cfg) => {
        this.config.set(cfg);
        this.minDate = addDays(cfg.minDaysForOnlineUpdate);
      },
    });
  }

  statusLabel(s: BookingStatus): string {
    return STATUS_LABELS[s] ?? s;
  }
  statusSeverity(s: BookingStatus): string {
    return STATUS_SEVERITY[s] ?? 'secondary';
  }

  serviceStatusLabel(s: BookingServiceStatus): string {
    return SERVICE_STATUS_LABELS[s] ?? s;
  }
  serviceStatusSeverity(s: BookingServiceStatus): string {
    return SERVICE_STATUS_SEVERITY[s] ?? 'secondary';
  }

  canEdit(b: BookingResponse): boolean {
    return (
      b.status === BookingStatus.PENDING || b.status === BookingStatus.CONFIRMED
    );
  }

  canDecideService(status: BookingServiceStatus): boolean {
    return status === BookingServiceStatus.PENDING;
  }

  allServicesDecided(): boolean {
    const b = this.booking();
    if (!b) return false;
    return b.services.every((s) => s.status !== BookingServiceStatus.PENDING);
  }

  canEditServices(): boolean {
    const b = this.booking();
    if (!b) return false;
    return b.services.every((s) => s.status === BookingServiceStatus.PENDING);
  }

  decideService(serviceId: string, newStatus: BookingServiceStatus): void {
    const booking = this.booking();
    if (!booking) return;

    this.bookingApi
      .updateBookingServiceStatus(booking.id, serviceId, { status: newStatus })
      .subscribe({
        next: (updated) => {
          this.booking.set(updated);
          this.messageService.add({
            severity: 'success',
            summary:
              newStatus === BookingServiceStatus.CONFIRMED
                ? 'Serviço confirmado'
                : 'Serviço recusado',
            detail: SERVICE_STATUS_LABELS[newStatus],
          });
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Erro',
            detail:
              err.error?.message ?? 'Não foi possível atualizar o status.',
          });
        },
      });
  }

  get editingDuration(): number {
    return this.editingServices.reduce((sum, s) => sum + s.durationMinutes, 0);
  }

  get editingTotalPrice(): number {
    return this.editingServices.reduce((sum, s) => sum + s.price, 0);
  }

  startEditDate(): void {
    this.newSlot.set(null);
    this.editMode.set('date');
  }

  startEditServices(): void {
    const booking = this.booking();
    if (!booking) return;

    this.servicesError.set(null);
    this.editMode.set('services');

    if (this.allServices() === null) {
      this.serviceApi.getServices().subscribe({
        next: (services) => {
          this.allServices.set(services);
          // Pre-select services that are already on the booking
          const currentIds = new Set(booking.services.map((s) => s.id));
          this.editingServices = services.filter((s) => currentIds.has(s.id));
        },
        error: () => {
          this.servicesError.set(
            'Não foi possível carregar a lista de serviços.',
          );
        },
      });
    } else {
      const currentIds = new Set(booking.services.map((s) => s.id));
      this.editingServices = (this.allServices() ?? []).filter((s) =>
        currentIds.has(s.id),
      );
    }
  }

  cancelEdit(): void {
    this.editMode.set(null);
    this.newSlot.set(null);
    this.editingServices = [];
    this.servicesError.set(null);
    this.actionError.set(null);
  }

  saveDate(): void {
    const slot = this.newSlot();
    if (!slot) return;
    const id = this.booking()!.id;
    this.saving.set(true);
    this.actionError.set(null);

    this.bookingApi
      .updateBooking(id, { scheduledAt: slot.startsAt })
      .subscribe({
        next: (b) => {
          this.saving.set(false);
          this.booking.set(b);
          this.editMode.set(null);
          this.newSlot.set(null);
          this.messageService.add({
            severity: 'success',
            summary: 'Horário alterado',
            detail: 'Agendamento atualizado com sucesso.',
          });
        },
        error: (err) => {
          this.saving.set(false);
          const msg: string = err.error?.message ?? 'Erro ao atualizar.';
          this.actionError.set(
            msg.toLowerCase().includes('antecedência')
              ? `${msg} Ligue: ${SALON_PHONE}`
              : msg,
          );
        },
      });
  }

  saveServices(): void {
    if (this.editingServices.length === 0) return;
    const id = this.booking()!.id;
    this.saving.set(true);
    this.servicesError.set(null);

    const serviceIds = this.editingServices.map((s) => s.id);

    this.bookingApi.updateBooking(id, { serviceIds }).subscribe({
      next: (b) => {
        this.saving.set(false);
        this.booking.set(b);
        this.editMode.set(null);
        this.editingServices = [];
        this.messageService.add({
          severity: 'success',
          summary: 'Serviços atualizados',
          detail: 'Lista de serviços do agendamento atualizada.',
        });
      },
      error: (err) => {
        this.saving.set(false);
        const msg: string =
          err.error?.message ?? 'Não foi possível atualizar os serviços.';
        if (msg.toLowerCase().includes('antecedência')) {
          this.servicesError.set(`${msg} Ligue: ${SALON_PHONE}`);
        } else if (
          msg.toLowerCase().includes('horário indisponível') ||
          msg.toLowerCase().includes('funcionamento') ||
          msg.toLowerCase().includes('almoço')
        ) {
          this.servicesError.set(
            `${msg} A nova duração não cabe no horário atual — edite também o horário.`,
          );
        } else {
          this.servicesError.set(msg);
        }
      },
    });
  }

  confirmBooking(): void {
    this.transitionStatus(BookingStatus.CONFIRMED, 'Agendamento confirmado');
  }

  confirmFinish(): void {
    this.confirmationService.confirm({
      message: 'Confirma a finalização deste agendamento?',
      header: 'Finalizar agendamento',
      icon: 'pi pi-flag-fill',
      acceptLabel: 'Finalizar',
      rejectLabel: 'Manter',
      accept: () =>
        this.transitionStatus(BookingStatus.FINISHED, 'Agendamento finalizado'),
    });
  }

  private transitionStatus(
    newStatus: BookingStatus,
    successMessage: string,
  ): void {
    const id = this.booking()!.id;
    this.transitioning.set(true);
    this.actionError.set(null);

    this.bookingApi.updateBookingStatus(id, { status: newStatus }).subscribe({
      next: (updated) => {
        this.transitioning.set(false);
        this.booking.set(updated);
        this.messageService.add({
          severity: 'success',
          summary: successMessage,
          detail: updated.customerName,
        });
      },
      error: (err) => {
        this.transitioning.set(false);
        this.actionError.set(
          err.error?.message ?? 'Não foi possível atualizar o status.',
        );
      },
    });
  }

  confirmCancel(): void {
    this.confirmationService.confirm({
      message: 'Tem certeza que deseja cancelar este agendamento?',
      header: 'Confirmar cancelamento',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Cancelar agendamento',
      rejectLabel: 'Manter',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.doCancel(),
    });
  }

  private doCancel(): void {
    const id = this.booking()!.id;
    this.bookingApi.cancelBooking(id).subscribe({
      next: (b) => {
        this.booking.set(b);
        this.messageService.add({
          severity: 'success',
          summary: 'Cancelado',
          detail: 'Agendamento cancelado.',
        });
      },
      error: (err) => {
        const msg: string = err.error?.message ?? 'Erro ao cancelar.';
        this.actionError.set(
          msg.toLowerCase().includes('antecedência')
            ? `${msg} Ligue: ${SALON_PHONE}`
            : msg,
        );
      },
    });
  }
}
