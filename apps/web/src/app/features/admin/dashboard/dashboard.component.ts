import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  BookingResponse,
  BookingStatus,
  WeeklyStats,
} from '@cabeleleila/contracts';
import { DateTime } from 'luxon';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { BookingApiService } from '../../../core/services/booking-api.service';
import { BrlCurrencyPipe } from '../../../shared/pipes/brl-currency.pipe';
import { SpDatetimePipe } from '../../../shared/pipes/sp-datetime.pipe';
import { SP_TZ } from '../../../shared/utils/date.utils';

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
    <div class="flex flex-column gap-4">
      <div
        class="flex justify-content-between align-items-center flex-wrap gap-2"
      >
        <h2 class="m-0">Dashboard</h2>
      </div>

      <!-- Week navigator -->
      <p-card>
        <div
          class="flex align-items-center justify-content-between gap-3 flex-wrap"
        >
          <div class="flex align-items-center gap-2">
            <p-button
              icon="pi pi-chevron-left"
              severity="secondary"
              outlined
              size="small"
              pTooltip="Semana anterior"
              (onClick)="goToPreviousWeek()"
            />
            <div class="flex flex-column">
              <span class="text-xs text-color-secondary">SEMANA</span>
              <span class="font-semibold text-lg">
                {{ weekRangeLabel() }}
              </span>
            </div>
            <p-button
              icon="pi pi-chevron-right"
              severity="secondary"
              outlined
              size="small"
              pTooltip="Próxima semana"
              (onClick)="goToNextWeek()"
            />
          </div>
          @if (!isCurrentWeek()) {
            <p-button
              label="Voltar para semana atual"
              icon="pi pi-calendar"
              size="small"
              text
              (onClick)="goToCurrentWeek()"
            />
          }
        </div>
      </p-card>

      <!-- Stat Cards -->
      @if (stats(); as s) {
        <div class="grid">
          <div class="col-12 sm:col-6 lg:col-3">
            <p-card styleClass="text-center">
              <div class="text-3xl font-bold">{{ s.totalBookings }}</div>
              <div class="text-color-secondary mt-1">Total</div>
            </p-card>
          </div>
          <div class="col-12 sm:col-6 lg:col-3">
            <p-card styleClass="text-center">
              <div class="text-3xl font-bold text-green-500">
                {{ s.confirmedBookings }}
              </div>
              <div class="text-color-secondary mt-1">Confirmados</div>
            </p-card>
          </div>
          <div class="col-12 sm:col-6 lg:col-3">
            <p-card styleClass="text-center">
              <div class="text-3xl font-bold text-red-500">
                {{ s.cancelledBookings }}
              </div>
              <div class="text-color-secondary mt-1">Cancelados</div>
            </p-card>
          </div>
          <div class="col-12 sm:col-6 lg:col-3">
            <p-card styleClass="text-center">
              <div class="text-3xl font-bold text-primary">
                {{ s.totalRevenue | brlCurrency }}
              </div>
              <div class="text-color-secondary mt-1">Receita</div>
            </p-card>
          </div>
        </div>
      } @else {
        <div class="grid">
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
      <div>
        <h3 class="mb-2">Agendamentos da semana</h3>
        @if (!bookings()) {
          <p class="text-color-secondary">Carregando...</p>
        } @else if (bookings()!.length === 0) {
          <p class="text-color-secondary text-center py-6">
            Nenhum agendamento nesta semana.
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
                    [routerLink]="['/bookings', b.id]"
                  ></a>
                </td>
              </tr>
            </ng-template>
          </p-table>
        }
      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private readonly bookingApi = inject(BookingApiService);

  /** Reference date inside the visible week (always Monday). */
  readonly weekStart = signal<DateTime>(this.computeWeekStart(DateTime.now()));

  readonly stats = signal<WeeklyStats | null>(null);
  readonly bookings = signal<BookingResponse[] | null>(null);

  readonly weekRangeLabel = computed(() => {
    const start = this.weekStart();
    const end = start.plus({ days: 6 });
    const sameMonth = start.month === end.month;
    const startFmt = sameMonth ? 'dd' : 'dd/MM';
    return `${start.toFormat(startFmt)} – ${end.toFormat('dd/MM/yyyy')}`;
  });

  readonly isCurrentWeek = computed(() => {
    const now = this.computeWeekStart(DateTime.now());
    return this.weekStart().toISODate() === now.toISODate();
  });

  ngOnInit(): void {
    this.loadWeek();
  }

  goToPreviousWeek(): void {
    this.weekStart.set(this.weekStart().minus({ weeks: 1 }));
    this.loadWeek();
  }

  goToNextWeek(): void {
    this.weekStart.set(this.weekStart().plus({ weeks: 1 }));
    this.loadWeek();
  }

  goToCurrentWeek(): void {
    this.weekStart.set(this.computeWeekStart(DateTime.now()));
    this.loadWeek();
  }

  private loadWeek(): void {
    const start = this.weekStart();
    const end = start.plus({ days: 7 }); // exclusive

    this.stats.set(null);
    this.bookings.set(null);

    this.bookingApi.getWeeklyStats(start.toISO()!).subscribe({
      next: (res) => this.stats.set(res),
    });

    this.bookingApi
      .getAllBookings({
        startDate: start.toISO()!,
        endDate: end.toISO()!,
      })
      .subscribe({
        next: (b) => this.bookings.set(b),
      });
  }

  private computeWeekStart(dt: DateTime): DateTime {
    return dt.setZone(SP_TZ).startOf('week'); // Monday in luxon
  }

  statusLabel(s: BookingStatus): string {
    return STATUS_LABELS[s] ?? s;
  }
  statusSeverity(s: BookingStatus): string {
    return STATUS_SEVERITY[s] ?? 'secondary';
  }
}
