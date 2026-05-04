import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { DatePickerModule } from 'primeng/datepicker';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { SkeletonModule } from 'primeng/skeleton';
import { BookingApiService } from '../../../core/services/booking-api.service';
import { WeeklyStats } from '@cabeleleila/contracts';
import { BookingResponse, BookingStatus } from '@cabeleleila/contracts';
import { SpDatetimePipe } from '../../../shared/pipes/sp-datetime.pipe';
import { BrlCurrencyPipe } from '../../../shared/pipes/brl-currency.pipe';
import { getWeekStart } from '../../../shared/utils/date.utils';

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
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    FormsModule,
    CardModule,
    DatePickerModule,
    TableModule,
    TagModule,
    ButtonModule,
    DividerModule,
    SkeletonModule,
    RouterLink,
    SpDatetimePipe,
    BrlCurrencyPipe,
  ],
  template: `
    <div
      class="flex justify-content-between align-items-center mb-4 flex-wrap gap-2"
    >
      <h2 class="m-0">Dashboard</h2>
      <p-datepicker
        [(ngModel)]="weekPicker"
        placeholder="Semana atual"
        [showButtonBar]="true"
        (onSelect)="loadWeek()"
        (onClear)="onClearWeek()"
        styleClass="w-full md:w-auto"
      />
    </div>

    <!-- Stat Cards -->
    @if (stats()) {
      <div class="grid mb-4">
        <div class="col-12 sm:col-6 lg:col-3">
          <p-card styleClass="text-center">
            <div class="text-3xl font-bold">{{ stats()!.totalBookings }}</div>
            <div class="text-color-secondary mt-1">Total</div>
          </p-card>
        </div>
        <div class="col-12 sm:col-6 lg:col-3">
          <p-card styleClass="text-center">
            <div class="text-3xl font-bold text-green-500">
              {{ stats()!.confirmedBookings }}
            </div>
            <div class="text-color-secondary mt-1">Confirmados</div>
          </p-card>
        </div>
        <div class="col-12 sm:col-6 lg:col-3">
          <p-card styleClass="text-center">
            <div class="text-3xl font-bold text-red-500">
              {{ stats()!.cancelledBookings }}
            </div>
            <div class="text-color-secondary mt-1">Cancelados</div>
          </p-card>
        </div>
        <div class="col-12 sm:col-6 lg:col-3">
          <p-card styleClass="text-center">
            <div class="text-3xl font-bold text-primary">
              {{ stats()!.totalRevenue | brlCurrency }}
            </div>
            <div class="text-color-secondary mt-1">Receita</div>
          </p-card>
        </div>
      </div>
    } @else {
      <div class="grid mb-4">
        @for (i of [1, 2, 3, 4]; track i) {
          <div class="col-12 sm:col-6 lg:col-3">
            <p-card>
              <p-skeleton height="2.5rem" styleClass="mb-2" />
              <p-skeleton width="60%" height="1rem" />
            </p-card>
          </div>
        }
      </div>
    }

    <!-- Bookings table -->
    <h3 class="mb-2">Agendamentos da semana</h3>
    @if (!bookings()) {
      <p class="text-color-secondary">Carregando...</p>
    } @else if (bookings()!.length === 0) {
      <p class="text-color-secondary">Nenhum agendamento nesta semana.</p>
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
            <th></th>
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
              <a
                pButton
                icon="pi pi-eye"
                text
                size="small"
                routerLink="/admin/bookings"
              ></a>
            </td>
          </tr>
        </ng-template>
      </p-table>
    }
  `,
})
export class DashboardComponent implements OnInit {
  private readonly bookingApi = inject(BookingApiService);

  weekPicker: Date | null = null;
  readonly stats = signal<WeeklyStats | null>(null);
  readonly bookings = signal<BookingResponse[] | null>(null);

  ngOnInit(): void {
    this.loadWeek();
  }

  loadWeek(): void {
    const weekOf = this.weekPicker ? getWeekStart(this.weekPicker) : undefined;

    this.bookingApi.getWeeklyStats(weekOf).subscribe({
      next: (res) => this.stats.set(res),
    });

    const filters = weekOf
      ? {
          startDate: new Date(weekOf).toISOString(),
          endDate: new Date(
            new Date(weekOf).getTime() + 6 * 86400000,
          ).toISOString(),
        }
      : undefined;

    this.bookingApi.getAllBookings(filters).subscribe({
      next: (b) => this.bookings.set(b),
    });
  }

  onClearWeek(): void {
    this.weekPicker = null;
    this.loadWeek();
  }

  statusLabel(s: BookingStatus): string {
    return STATUS_LABELS[s] ?? s;
  }
  statusSeverity(s: BookingStatus): string {
    return STATUS_SEVERITY[s] ?? 'secondary';
  }
}
