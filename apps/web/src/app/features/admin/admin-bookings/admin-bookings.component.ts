import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  BookingListFilters,
  BookingResponse,
  BookingStatus,
  DEFAULT_PAGE_SIZE,
} from '@cabeleleila/contracts';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
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
        (onChange)="onFilterChange()"
        styleClass="w-full md:w-auto"
      />
      <p-datepicker
        [(ngModel)]="filterRange"
        selectionMode="range"
        placeholder="Período"
        [showButtonBar]="true"
        (onSelect)="onFilterChange()"
        (onClear)="onFilterChange()"
        styleClass="w-full md:w-auto"
      />
    </div>

    <p-table
      [value]="bookings()"
      [lazy]="true"
      [paginator]="true"
      [rows]="pageSize"
      [totalRecords]="total()"
      [rowsPerPageOptions]="[10, 20, 50]"
      [loading]="loading()"
      (onLazyLoad)="onLazyLoad($event)"
      [rowHover]="true"
      responsiveLayout="stack"
      breakpoint="768px"
      currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords}"
      [showCurrentPageReport]="true"
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
            <div class="flex gap-1 align-items-center">
              <a
                pButton
                icon="pi pi-eye"
                rounded
                text
                size="small"
                pTooltip="Ver detalhes"
                tooltipPosition="top"
                [routerLink]="['/bookings', b.id]"
              ></a>
              @if (b.status === 'PENDING') {
                <p-button
                  icon="pi pi-check"
                  severity="success"
                  rounded
                  text
                  size="small"
                  pTooltip="Confirmar"
                  tooltipPosition="top"
                  [loading]="busyId() === b.id"
                  (onClick)="confirm(b)"
                />
              }
              @if (b.status === 'CONFIRMED') {
                <p-button
                  icon="pi pi-flag-fill"
                  severity="secondary"
                  rounded
                  text
                  size="small"
                  pTooltip="Finalizar"
                  tooltipPosition="top"
                  [loading]="busyId() === b.id"
                  (onClick)="confirmFinish(b)"
                />
              }
              @if (b.status === 'PENDING' || b.status === 'CONFIRMED') {
                <p-button
                  icon="pi pi-times"
                  severity="danger"
                  rounded
                  text
                  size="small"
                  pTooltip="Cancelar"
                  tooltipPosition="top"
                  (onClick)="confirmCancel(b)"
                />
              }
            </div>
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr>
          <td colspan="5" class="text-center py-6 text-color-secondary">
            Nenhum agendamento encontrado.
          </td>
        </tr>
      </ng-template>
    </p-table>
  `,
})
export class AdminBookingsComponent {
  private readonly bookingApi = inject(BookingApiService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  filterStatus: BookingStatus | null = null;
  filterRange: Date[] | null = null;

  readonly busyId = signal<string | null>(null);
  readonly loading = signal(false);
  readonly bookings = signal<BookingResponse[]>([]);
  readonly total = signal(0);
  readonly pageSize = DEFAULT_PAGE_SIZE;

  private currentPage = 1;
  private currentLimit = DEFAULT_PAGE_SIZE;

  readonly statusOptions = Object.values(BookingStatus).map((v) => ({
    label: STATUS_LABELS[v],
    value: v,
  }));

  /** Triggered by PrimeNG table when user changes page/sort. */
  onLazyLoad(event: TableLazyLoadEvent): void {
    const first = event.first ?? 0;
    const rows = event.rows ?? DEFAULT_PAGE_SIZE;
    this.currentLimit = rows;
    this.currentPage = Math.floor(first / rows) + 1;
    this.reload();
  }

  /** Triggered by filter inputs — resets to first page. */
  onFilterChange(): void {
    this.currentPage = 1;
    this.reload();
  }

  private reload(): void {
    const filters = this.buildFilters();
    this.loading.set(true);
    this.bookingApi
      .getAllBookings(filters, {
        page: this.currentPage,
        limit: this.currentLimit,
      })
      .subscribe({
        next: (res) => {
          this.bookings.set(res.data);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: () => {
          this.bookings.set([]);
          this.total.set(0);
          this.loading.set(false);
        },
      });
  }

  private buildFilters(): BookingListFilters {
    const f: BookingListFilters = {};
    if (this.filterStatus) f.status = this.filterStatus;
    if (this.filterRange?.[0]) f.startDate = this.filterRange[0].toISOString();
    if (this.filterRange?.[1]) f.endDate = this.filterRange[1].toISOString();
    return f;
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
          this.reload();
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
        this.reload();
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
