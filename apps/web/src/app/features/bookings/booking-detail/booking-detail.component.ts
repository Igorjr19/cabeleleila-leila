import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BookingResponse, BookingStatus } from '@cabeleleila/contracts';
import { DateTime } from 'luxon';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { DividerModule } from 'primeng/divider';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { SALON_PHONE } from '../../../core/constants/establishment';
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
    DatePickerModule,
    ConfirmDialogModule,
    DividerModule,
    SpDatetimePipe,
    BrlCurrencyPipe,
  ],
  template: `
    <div class="max-w-2xl mx-auto">
      <div class="flex align-items-center gap-2 mb-4">
        <p-button
          icon="pi pi-arrow-left"
          text
          (onClick)="router.navigate(['/bookings'])"
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
              @for (s of booking()!.services; track s.id) {
                <div class="flex justify-content-between py-1">
                  <span>{{ s.name }}</span>
                  <span class="font-semibold">{{ s.price | brlCurrency }}</span>
                </div>
              }
            </div>

            <!-- Error -->
            @if (actionError()) {
              <p-message severity="error" [text]="actionError()!" />
            }

            <!-- Edit form -->
            @if (editMode()) {
              <p-divider />
              <div class="flex flex-column gap-2">
                <label class="font-semibold">Nova data e horário</label>
                <p-datepicker
                  [(ngModel)]="newDate"
                  [showTime]="true"
                  [minDate]="minDate"
                  [hourFormat]="'24'"
                  (onSelect)="validateNewDate()"
                  styleClass="w-full"
                />
                @if (dateError()) {
                  <small class="p-error">{{ dateError() }}</small>
                }
                <div class="flex gap-2 justify-content-end">
                  <p-button
                    label="Cancelar"
                    severity="secondary"
                    (onClick)="
                      editMode.set(false); newDate = null; dateError.set(null)
                    "
                  />
                  <p-button
                    label="Salvar"
                    [loading]="saving()"
                    [disabled]="!newDate || !!dateError()"
                    (onClick)="saveEdit()"
                  />
                </div>
              </div>
            }

            <!-- Actions -->
            @if (!editMode() && canEdit(booking()!)) {
              <p-divider />
              <div class="flex gap-2 flex-wrap">
                <p-button
                  label="Editar horário"
                  icon="pi pi-pencil"
                  severity="secondary"
                  (onClick)="startEdit()"
                />
                <p-button
                  label="Cancelar agendamento"
                  icon="pi pi-times"
                  severity="danger"
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
  private readonly bookingApi = inject(BookingApiService);
  private readonly establishmentApi = inject(EstablishmentApiService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly booking = signal<BookingResponse | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly editMode = signal(false);
  readonly dateError = signal<string | null>(null);

  newDate: Date | null = null;
  minDate = addDays(2);
  private config: EstablishmentConfig | null = null;

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
      next: (res) => {
        this.config = res.config;
        this.minDate = addDays(res.config.min_days_for_online_update);
      },
    });
  }

  statusLabel(s: BookingStatus): string {
    return STATUS_LABELS[s] ?? s;
  }
  statusSeverity(s: BookingStatus): string {
    return STATUS_SEVERITY[s] ?? 'secondary';
  }

  canEdit(b: BookingResponse): boolean {
    return (
      b.status === BookingStatus.PENDING || b.status === BookingStatus.CONFIRMED
    );
  }

  startEdit(): void {
    const scheduledAt = this.booking()?.scheduledAt;
    if (scheduledAt) {
      // Convert UTC -> SP wall-clock time, then shift to local tz keeping same digits
      // so the datepicker shows the SP time and toUtcISO() round-trips correctly
      this.newDate = DateTime.fromISO(scheduledAt, { zone: 'utc' })
        .setZone('America/Sao_Paulo')
        .setZone('local', { keepLocalTime: true })
        .toJSDate();
    }
    this.editMode.set(true);
  }

  validateNewDate(): void {
    if (!this.newDate || !this.config) return;
    const dt = DateTime.fromJSDate(this.newDate).setZone('America/Sao_Paulo', {
      keepLocalTime: true,
    });
    const result = isValidBusinessHour(dt, this.config.business_hours);
    this.dateError.set(
      result.valid ? null : (result.reason ?? 'Horário inválido'),
    );
  }

  saveEdit(): void {
    if (!this.newDate) return;
    const id = this.booking()!.id;
    this.saving.set(true);
    this.actionError.set(null);

    this.bookingApi
      .updateBooking(id, { scheduledAt: toUtcISO(this.newDate) })
      .subscribe({
        next: (b) => {
          this.saving.set(false);
          this.booking.set(b);
          this.editMode.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Atualizado',
            detail: 'Horário alterado com sucesso.',
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
