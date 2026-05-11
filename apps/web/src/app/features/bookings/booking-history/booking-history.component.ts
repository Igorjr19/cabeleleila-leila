import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { SALON_PHONE } from '../../../core/constants/establishment';
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
  selector: 'app-booking-history',
  standalone: true,
  imports: [
    TableModule,
    ButtonModule,
    SelectModule,
    DatePickerModule,
    TagModule,
    MessageModule,
    ConfirmDialogModule,
    TooltipModule,
    FormsModule,
    RouterLink,
    SpDatetimePipe,
  ],
  template: `
    <div
      class="flex flex-wrap justify-content-between align-items-center gap-2 mb-3"
    >
      <h2 class="m-0">Meus Agendamentos</h2>
      <a
        pButton
        routerLink="/bookings/new"
        label="Novo Agendamento"
        icon="pi pi-plus"
      ></a>
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
          <th>Serviços</th>
          <th>Status</th>
          <th>Ações</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-booking>
        <tr>
          <td>{{ booking.scheduledAt | spDatetime }}</td>
          <td>{{ serviceNames(booking) }}</td>
          <td>
            <p-tag
              [value]="statusLabel(booking.status)"
              [severity]="statusSeverity(booking.status)"
            />
          </td>
          <td>
            <div class="flex gap-1">
              <a
                pButton
                icon="pi pi-eye"
                text
                rounded
                size="small"
                [routerLink]="['/bookings', booking.id]"
                pTooltip="Ver detalhes"
              ></a>
              @if (canCancel(booking)) {
                <p-button
                  icon="pi pi-times"
                  text
                  rounded
                  severity="danger"
                  size="small"
                  (onClick)="confirmCancel(booking)"
                  pTooltip="Cancelar"
                />
              }
            </div>
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr>
          <td colspan="4" class="text-center py-6 text-color-secondary">
            Nenhum agendamento encontrado.
          </td>
        </tr>
      </ng-template>
    </p-table>
  `,
})
export class BookingHistoryComponent {
  private readonly bookingApi = inject(BookingApiService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  readonly router = inject(Router);

  filterStatus: BookingStatus | null = null;
  filterRange: Date[] | null = null;

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

  onLazyLoad(event: TableLazyLoadEvent): void {
    const first = event.first ?? 0;
    const rows = event.rows ?? DEFAULT_PAGE_SIZE;
    this.currentLimit = rows;
    this.currentPage = Math.floor(first / rows) + 1;
    this.reload();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.reload();
  }

  private reload(): void {
    const filters = this.buildFilters();
    this.loading.set(true);
    this.bookingApi
      .getMyBookings(filters, {
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

  serviceNames(booking: BookingResponse): string {
    return booking.services.map((s) => s.name).join(', ') || '—';
  }

  statusLabel(s: BookingStatus): string {
    return STATUS_LABELS[s] ?? s;
  }

  statusSeverity(s: BookingStatus): string {
    return STATUS_SEVERITY[s] ?? 'secondary';
  }

  canCancel(b: BookingResponse): boolean {
    return (
      b.status === BookingStatus.PENDING || b.status === BookingStatus.CONFIRMED
    );
  }

  confirmCancel(booking: BookingResponse): void {
    this.confirmationService.confirm({
      message: `Cancelar agendamento de ${new Date(booking.scheduledAt).toLocaleDateString('pt-BR')}?`,
      header: 'Confirmar cancelamento',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Cancelar agendamento',
      rejectLabel: 'Manter',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.doCancel(booking.id),
    });
  }

  private doCancel(id: string): void {
    this.bookingApi.cancelBooking(id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Cancelado',
          detail: 'Agendamento cancelado.',
        });
        this.reload();
      },
      error: (err) => {
        const msg: string = err.error?.message ?? 'Erro ao cancelar.';
        const detail = msg.toLowerCase().includes('antecedência')
          ? `${msg} Ligue: ${SALON_PHONE}`
          : msg;
        this.messageService.add({ severity: 'error', summary: 'Erro', detail });
      },
    });
  }
}
