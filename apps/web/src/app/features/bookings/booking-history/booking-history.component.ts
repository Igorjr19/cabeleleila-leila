import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TagModule } from 'primeng/tag';
import { MessageModule } from 'primeng/message';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { FormsModule } from '@angular/forms';
import {
  BookingListFilters,
  BookingResponse,
  BookingStatus,
} from '@cabeleleila/contracts';
import { BookingApiService } from '../../../core/services/booking-api.service';
import { SpDatetimePipe } from '../../../shared/pipes/sp-datetime.pipe';
import { BrlCurrencyPipe } from '../../../shared/pipes/brl-currency.pipe';
import { SALON_PHONE } from '../../../core/constants/establishment';

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
    FormsModule,
    RouterLink,
    SpDatetimePipe,
    BrlCurrencyPipe,
  ],
  template: `
    <div class="flex justify-content-between align-items-center mb-3">
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
                  size="small"
                  [routerLink]="['/bookings', booking.id]"
                  pTooltip="Ver detalhes"
                ></a>
                @if (canCancel(booking)) {
                  <p-button
                    icon="pi pi-times"
                    text
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
      </p-table>
    }
  `,
})
export class BookingHistoryComponent {
  private readonly bookingApi = inject(BookingApiService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  readonly router = inject(Router);

  filterStatus: BookingStatus | null = null;
  filterRange: Date[] | null = null;

  readonly filters = signal<BookingListFilters>({});

  readonly bookings = toSignal(
    toObservable(this.filters).pipe(
      switchMap((f) => this.bookingApi.getMyBookings(f)),
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
        this.applyFilters();
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
