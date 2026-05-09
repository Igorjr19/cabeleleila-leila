import { Component, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  BookingListFilters,
  BookingResponse,
  BookingStatus,
} from '@cabeleleila/contracts';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { switchMap } from 'rxjs';
import { BookingApiService } from '../../../core/services/booking-api.service';
import { SpDatetimePipe } from '../../../shared/pipes/sp-datetime.pipe';

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
  selector: 'app-admin-bookings',
  standalone: true,
  imports: [
    FormsModule,
    TableModule,
    ButtonModule,
    SelectModule,
    DatePickerModule,
    TagModule,
    TooltipModule,
    ConfirmDialogModule,
    RouterLink,
    SpDatetimePipe,
  ],
  template: `
    <div class="flex justify-content-between align-items-center mb-3">
      <h2 class="m-0">Todos os Agendamentos</h2>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-2 mb-3">
      <p-select
        [options]="statusOptions"
        [(ngModel)]="filterStatus"
        optionLabel="label"
        optionValue="value"
        placeholder="Todos os status"
        [showClear]="true"
        (onChange)="applyFilters()"
        styleClass="w-full md:w-auto"
      />
      <p-datepicker
        [(ngModel)]="filterRange"
        selectionMode="range"
        placeholder="Período"
        [showButtonBar]="true"
        (onSelect)="applyFilters()"
        (onClear)="applyFilters()"
        styleClass="w-full md:w-auto"
      />
    </div>

    @if (bookings() === undefined) {
      <p class="text-color-secondary">Carregando...</p>
    } @else if (bookings()!.length === 0) {
      <p class="text-color-secondary text-center py-6">
        Nenhum agendamento encontrado.
      </p>
    } @else {
      <p-table
        [value]="bookings()!"
        [rowHover]="true"
        responsiveLayout="stack"
        breakpoint="768px"
      >
        <ng-template pTemplate="header">
          <tr>
            <th>Data</th>
            <th>Cliente</th>
            <th>Serviços</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-b>
          <tr>
            <td>{{ b.scheduledAt | spDatetime }}</td>
            <td>{{ b.customerName }}</td>
            <td>{{ b.services.length }} serviço(s)</td>
            <td>
              <p-tag
                [value]="statusLabel(b.status)"
                [severity]="statusSeverity(b.status)"
              />
            </td>
            <td>
              <div class="flex gap-2 flex-wrap align-items-center">
                <a
                  pButton
                  icon="pi pi-eye"
                  label="Detalhes"
                  outlined
                  size="small"
                  [routerLink]="['/bookings', b.id]"
                ></a>
                @if (b.status === 'PENDING') {
                  <p-button
                    icon="pi pi-check"
                    label="Confirmar"
                    severity="success"
                    size="small"
                    [loading]="busyId() === b.id"
                    (onClick)="confirm(b)"
                  />
                }
                @if (b.status === 'CONFIRMED') {
                  <p-button
                    icon="pi pi-flag-fill"
                    label="Finalizar"
                    severity="secondary"
                    size="small"
                    [loading]="busyId() === b.id"
                    (onClick)="confirmFinish(b)"
                  />
                }
                @if (b.status === 'PENDING' || b.status === 'CONFIRMED') {
                  <p-button
                    icon="pi pi-times"
                    label="Cancelar"
                    severity="danger"
                    outlined
                    size="small"
                    (onClick)="confirmCancel(b)"
                  />
                }
              </div>
            </td>
          </tr>
        </ng-template>
      </p-table>
    }
  `,
})
export class AdminBookingsComponent {
  private readonly bookingApi = inject(BookingApiService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  filterStatus: BookingStatus | null = null;
  filterRange: Date[] | null = null;

  readonly filters = signal<BookingListFilters>({});
  readonly busyId = signal<string | null>(null);

  readonly bookings = toSignal(
    toObservable(this.filters).pipe(
      switchMap((f) => this.bookingApi.getAllBookings(f)),
    ),
  );

  readonly statusOptions = Object.values(BookingStatus).map((v) => ({
    label: STATUS_LABELS[v],
    value: v,
  }));

  applyFilters(): void {
    const f: BookingListFilters = {};
    if (this.filterStatus) f.status = this.filterStatus;
    if (this.filterRange?.[0]) f.startDate = this.filterRange[0].toISOString();
    if (this.filterRange?.[1]) f.endDate = this.filterRange[1].toISOString();
    this.filters.set(f);
  }

  confirm(booking: BookingResponse): void {
    this.transitionStatus(
      booking,
      BookingStatus.CONFIRMED,
      'Agendamento confirmado',
    );
  }

  confirmFinish(booking: BookingResponse): void {
    this.confirmationService.confirm({
      message: `Finalizar o agendamento de ${booking.customerName}?`,
      header: 'Finalizar agendamento',
      icon: 'pi pi-flag-fill',
      acceptLabel: 'Finalizar',
      rejectLabel: 'Manter',
      accept: () =>
        this.transitionStatus(
          booking,
          BookingStatus.FINISHED,
          'Agendamento finalizado',
        ),
    });
  }

  confirmCancel(booking: BookingResponse): void {
    this.confirmationService.confirm({
      message: `Cancelar o agendamento de ${booking.customerName}?`,
      header: 'Cancelar agendamento',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Cancelar agendamento',
      rejectLabel: 'Manter',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.doCancel(booking),
    });
  }

  private transitionStatus(
    booking: BookingResponse,
    newStatus: BookingStatus,
    successMessage: string,
  ): void {
    this.busyId.set(booking.id);
    this.bookingApi
      .updateBookingStatus(booking.id, { status: newStatus })
      .subscribe({
        next: () => {
          this.busyId.set(null);
          this.messageService.add({
            severity: 'success',
            summary: successMessage,
            detail: booking.customerName,
          });
          this.applyFilters();
        },
        error: (err) => {
          this.busyId.set(null);
          this.messageService.add({
            severity: 'error',
            summary: 'Erro',
            detail:
              err.error?.message ?? 'Não foi possível atualizar o status.',
          });
        },
      });
  }

  private doCancel(booking: BookingResponse): void {
    this.busyId.set(booking.id);
    this.bookingApi.cancelBooking(booking.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.messageService.add({
          severity: 'success',
          summary: 'Agendamento cancelado',
          detail: booking.customerName,
        });
        this.applyFilters();
      },
      error: (err) => {
        this.busyId.set(null);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: err.error?.message ?? 'Não foi possível cancelar.',
        });
      },
    });
  }

  statusLabel(s: BookingStatus): string {
    return STATUS_LABELS[s] ?? s;
  }
  statusSeverity(s: BookingStatus): string {
    return STATUS_SEVERITY[s] ?? 'secondary';
  }
}
