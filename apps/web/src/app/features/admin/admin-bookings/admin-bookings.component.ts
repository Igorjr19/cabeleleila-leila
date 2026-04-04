import { SlicePipe } from '@angular/common';
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
    SlicePipe,
    FormsModule,
    TableModule,
    ButtonModule,
    SelectModule,
    DatePickerModule,
    TagModule,
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
            <td class="text-sm text-color-secondary">
              {{ b.customerId | slice: 0 : 8 }}...
            </td>
            <td>{{ b.services.length }} serviço(s)</td>
            <td>
              <p-select
                [options]="statusOptions"
                [(ngModel)]="b.status"
                optionLabel="label"
                optionValue="value"
                (onChange)="changeStatus(b, $event.value)"
                styleClass="p-select-sm"
              />
            </td>
            <td>
              <div class="flex gap-1">
                <a
                  pButton
                  icon="pi pi-eye"
                  text
                  size="small"
                  [routerLink]="['/bookings', b.id]"
                  pTooltip="Ver detalhes"
                ></a>
                @if (b.status === 'PENDING' || b.status === 'CONFIRMED') {
                  <p-button
                    icon="pi pi-times"
                    text
                    severity="danger"
                    size="small"
                    (onClick)="confirmCancel(b)"
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
export class AdminBookingsComponent {
  private readonly bookingApi = inject(BookingApiService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  filterStatus: BookingStatus | null = null;
  filterRange: Date[] | null = null;

  readonly filters = signal<BookingListFilters>({});

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

  changeStatus(booking: BookingResponse, newStatus: BookingStatus): void {
    this.bookingApi
      .updateBookingStatus(booking.id, { status: newStatus })
      .subscribe({
        next: () =>
          this.messageService.add({
            severity: 'success',
            summary: 'Status atualizado',
            detail: STATUS_LABELS[newStatus],
          }),
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Erro',
            detail: 'Não foi possível atualizar o status.',
          });
          this.applyFilters();
        },
      });
  }

  confirmCancel(booking: BookingResponse): void {
    this.confirmationService.confirm({
      message: 'Cancelar este agendamento?',
      header: 'Confirmar',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Cancelar agendamento',
      rejectLabel: 'Manter',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.bookingApi.cancelBooking(booking.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Cancelado',
              detail: '',
            });
            this.applyFilters();
          },
          error: () =>
            this.messageService.add({
              severity: 'error',
              summary: 'Erro',
              detail: 'Não foi possível cancelar.',
            }),
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
