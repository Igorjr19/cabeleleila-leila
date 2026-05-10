import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { BookingApiService } from '../../../core/services/booking-api.service';
import {
  TimeBlock,
  TimeBlocksApiService,
} from '../../../core/services/time-blocks-api.service';
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

interface TimelineItem {
  type: 'booking' | 'block';
  startsAt: DateTime;
  endsAt: DateTime;
  booking?: BookingResponse;
  block?: TimeBlock;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    CardModule,
    TableModule,
    TagModule,
    ButtonModule,
    DividerModule,
    SkeletonModule,
    TabsModule,
    TooltipModule,
    SpDatetimePipe,
    BrlCurrencyPipe,
  ],
  template: `
    <div class="flex flex-column gap-4">
      <div
        class="flex justify-content-between align-items-center flex-wrap gap-2"
      >
        <div>
          <h2 class="m-0">Painel</h2>
          <p class="text-color-secondary mt-1 mb-0 text-sm">
            Visão operacional do dia e desempenho da semana.
          </p>
        </div>
        <p-button
          label="Bloquear horário"
          icon="pi pi-ban"
          severity="secondary"
          outlined
          size="small"
          (onClick)="router.navigate(['/admin/time-blocks'])"
        />
      </div>

      <p-tabs [(value)]="activeTab">
        <p-tablist>
          <p-tab value="today">
            <i class="pi pi-clock mr-2"></i>
            Hoje
          </p-tab>
          <p-tab value="week">
            <i class="pi pi-chart-bar mr-2"></i>
            Semana
          </p-tab>
        </p-tablist>

        <p-tabpanels>
          <!-- ───────────────────────────── HOJE ──────────────────────────── -->
          <p-tabpanel value="today">
            <div class="flex flex-column gap-4 pt-3">
              <p class="text-color-secondary m-0">
                <i class="pi pi-calendar mr-1"></i>
                {{ todayLabel() }}
              </p>

              <!-- KPIs do dia -->
              <div class="grid">
                <div class="col-6 md:col-3">
                  <p-card styleClass="text-center">
                    <div class="text-3xl font-bold">{{ totalToday() }}</div>
                    <div class="text-color-secondary mt-1 text-sm">
                      Agendamentos
                    </div>
                  </p-card>
                </div>
                <div class="col-6 md:col-3">
                  <p-card styleClass="text-center">
                    <div class="text-3xl font-bold text-orange-500">
                      {{ pendingToday() }}
                    </div>
                    <div class="text-color-secondary mt-1 text-sm">
                      Pendentes
                    </div>
                  </p-card>
                </div>
                <div class="col-6 md:col-3">
                  <p-card styleClass="text-center">
                    <div class="text-3xl font-bold text-green-500">
                      {{ confirmedToday() }}
                    </div>
                    <div class="text-color-secondary mt-1 text-sm">
                      Confirmados
                    </div>
                  </p-card>
                </div>
                <div class="col-6 md:col-3">
                  <p-card styleClass="text-center">
                    <div class="text-3xl font-bold text-primary">
                      {{ revenueToday() | brlCurrency }}
                    </div>
                    <div class="text-color-secondary mt-1 text-sm">
                      Receita prevista
                    </div>
                  </p-card>
                </div>
              </div>

              <!-- Timeline -->
              <p-card>
                <ng-template pTemplate="title">
                  <span class="flex align-items-center gap-2">
                    <i class="pi pi-clock text-primary"></i>
                    Agenda do dia
                  </span>
                </ng-template>

                @if (loadingToday()) {
                  <div class="flex flex-column gap-2">
                    @for (i of [1, 2, 3]; track i) {
                      <p-skeleton height="4rem" />
                    }
                  </div>
                } @else if (timeline().length === 0) {
                  <div class="text-center py-6">
                    <i
                      class="pi pi-calendar text-6xl text-color-secondary mb-3"
                      style="display: block;"
                    ></i>
                    <p class="text-color-secondary m-0">
                      Nenhum agendamento para hoje. Aproveite a folga!
                    </p>
                  </div>
                } @else {
                  <div class="flex flex-column gap-2">
                    @for (item of timeline(); track $index) {
                      @if (item.type === 'booking' && item.booking; as b) {
                        <div
                          class="border-round p-3 surface-50 cursor-pointer hover:surface-100 transition-colors transition-duration-150"
                          (click)="router.navigate(['/bookings', b.id])"
                        >
                          <div
                            class="flex justify-content-between align-items-center flex-wrap gap-2"
                          >
                            <div class="flex align-items-center gap-3">
                              <div
                                class="text-2xl font-bold"
                                style="min-width: 4.5rem"
                              >
                                {{ formatTime(item.startsAt) }}
                              </div>
                              <div class="flex flex-column gap-1">
                                <span class="font-semibold">
                                  {{ b.customerName }}
                                </span>
                                <span class="text-sm text-color-secondary">
                                  {{ b.services.length }} serviço(s) ·
                                  {{ formatTime(item.startsAt) }}–{{
                                    formatTime(item.endsAt)
                                  }}
                                </span>
                              </div>
                            </div>
                            <p-tag
                              [value]="statusLabel(b.status)"
                              [severity]="statusSeverity(b.status)"
                            />
                          </div>
                        </div>
                      }
                      @if (item.type === 'block' && item.block; as bl) {
                        <div
                          class="border-round p-3 surface-100 border-1 surface-border"
                          style="border-style: dashed !important"
                        >
                          <div
                            class="flex justify-content-between align-items-center flex-wrap gap-2"
                          >
                            <div class="flex align-items-center gap-3">
                              <div
                                class="text-2xl font-bold text-color-secondary"
                                style="min-width: 4.5rem"
                              >
                                {{ formatTime(item.startsAt) }}
                              </div>
                              <div class="flex flex-column gap-1">
                                <span class="font-semibold">
                                  <i class="pi pi-ban mr-1"></i>
                                  Horário bloqueado
                                </span>
                                <span class="text-sm text-color-secondary">
                                  {{ bl.reason || 'Sem motivo informado' }} ·
                                  {{ formatTime(item.startsAt) }}–{{
                                    formatTime(item.endsAt)
                                  }}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      }
                    }
                  </div>
                }
              </p-card>
            </div>
          </p-tabpanel>

          <!-- ──────────────────────────── SEMANA ─────────────────────────── -->
          <p-tabpanel value="week">
            <div class="flex flex-column gap-4 pt-3">
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

              <!-- Week stats -->
              @if (weekStats(); as s) {
                <div class="grid">
                  <div class="col-12 sm:col-6 lg:col-3">
                    <p-card styleClass="text-center">
                      <div class="text-3xl font-bold">
                        {{ s.totalBookings }}
                      </div>
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

              <!-- Top services -->
              @if (weekStats()?.topServices?.length) {
                <p-card>
                  <ng-template pTemplate="title">
                    <span class="flex align-items-center gap-2">
                      <i class="pi pi-star-fill text-primary"></i>
                      Serviços mais procurados
                    </span>
                  </ng-template>
                  <div class="flex flex-column gap-2">
                    @for (
                      svc of weekStats()!.topServices;
                      track svc.serviceId;
                      let i = $index
                    ) {
                      <div
                        class="flex align-items-center justify-content-between gap-3 surface-50 border-round p-3 flex-wrap"
                      >
                        <div class="flex align-items-center gap-3">
                          <span
                            class="border-circle bg-primary text-white flex align-items-center justify-content-center font-bold"
                            style="width: 2rem; height: 2rem"
                          >
                            {{ i + 1 }}
                          </span>
                          <div class="flex flex-column">
                            <span class="font-semibold">{{ svc.name }}</span>
                            <span class="text-sm text-color-secondary">
                              {{ svc.count }} agendamento(s)
                            </span>
                          </div>
                        </div>
                        <span class="font-bold text-primary">
                          {{ svc.revenue | brlCurrency }}
                        </span>
                      </div>
                    }
                  </div>
                </p-card>
              }

              <!-- Bookings table -->
              <div>
                <h3 class="mb-2">Agendamentos da semana</h3>
                @if (!weekBookings()) {
                  <p class="text-color-secondary">Carregando...</p>
                } @else if (weekBookings()!.length === 0) {
                  <p class="text-color-secondary text-center py-6">
                    Nenhum agendamento nesta semana.
                  </p>
                } @else {
                  <p-table
                    [value]="weekBookings()!"
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
          </p-tabpanel>
        </p-tabpanels>
      </p-tabs>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  readonly router = inject(Router);
  private readonly bookingApi = inject(BookingApiService);
  private readonly timeBlocksApi = inject(TimeBlocksApiService);

  activeTab: 'today' | 'week' = 'today';

  // ── Today state ─────────────────────────────────────────────────────────
  readonly loadingToday = signal(true);
  readonly todayBookings = signal<BookingResponse[]>([]);
  readonly todayBlocks = signal<TimeBlock[]>([]);

  readonly todayLabel = signal(
    DateTime.now()
      .setZone(SP_TZ)
      .setLocale('pt-BR')
      .toFormat("cccc, dd 'de' LLLL"),
  );

  readonly timeline = computed<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];

    for (const b of this.todayBookings()) {
      if (b.status === BookingStatus.CANCELLED) continue;
      const start = DateTime.fromISO(b.scheduledAt, { zone: 'utc' }).setZone(
        SP_TZ,
      );
      const duration = b.services.reduce(
        (sum, s) => sum + s.durationMinutes,
        0,
      );
      const end = start.plus({ minutes: duration });
      items.push({ type: 'booking', startsAt: start, endsAt: end, booking: b });
    }

    for (const bl of this.todayBlocks()) {
      items.push({
        type: 'block',
        startsAt: DateTime.fromISO(bl.startsAt, { zone: 'utc' }).setZone(SP_TZ),
        endsAt: DateTime.fromISO(bl.endsAt, { zone: 'utc' }).setZone(SP_TZ),
        block: bl,
      });
    }

    return items.sort((a, b) => a.startsAt.toMillis() - b.startsAt.toMillis());
  });

  readonly totalToday = computed(
    () =>
      this.todayBookings().filter((b) => b.status !== BookingStatus.CANCELLED)
        .length,
  );
  readonly pendingToday = computed(
    () =>
      this.todayBookings().filter((b) => b.status === BookingStatus.PENDING)
        .length,
  );
  readonly confirmedToday = computed(
    () =>
      this.todayBookings().filter((b) => b.status === BookingStatus.CONFIRMED)
        .length,
  );
  readonly revenueToday = computed(() =>
    this.todayBookings()
      .filter((b) => b.status !== BookingStatus.CANCELLED)
      .reduce(
        (sum, b) =>
          sum +
          b.services
            .filter((s) => s.status !== 'DECLINED')
            .reduce((acc, s) => acc + s.price, 0),
        0,
      ),
  );

  // ── Week state ──────────────────────────────────────────────────────────
  readonly weekStart = signal<DateTime>(this.computeWeekStart(DateTime.now()));
  readonly weekStats = signal<WeeklyStats | null>(null);
  readonly weekBookings = signal<BookingResponse[] | null>(null);

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
    this.loadToday();
    this.loadWeek();
  }

  // ── Today loaders ───────────────────────────────────────────────────────

  private loadToday(): void {
    this.loadingToday.set(true);
    const startOfDay = DateTime.now().setZone(SP_TZ).startOf('day');
    const endOfDay = startOfDay.plus({ days: 1 });

    let pendingCalls = 2;
    const done = () => {
      pendingCalls--;
      if (pendingCalls === 0) this.loadingToday.set(false);
    };

    this.bookingApi
      .getAllBookings({
        startDate: startOfDay.toISO()!,
        endDate: endOfDay.toISO()!,
      })
      .subscribe({
        next: (b) => {
          this.todayBookings.set(b);
          done();
        },
        error: () => {
          this.todayBookings.set([]);
          done();
        },
      });

    this.timeBlocksApi.list().subscribe({
      next: (blocks) => {
        const filtered = blocks.filter((bl) => {
          const blStart = DateTime.fromISO(bl.startsAt, { zone: 'utc' });
          return blStart < endOfDay && blStart >= startOfDay;
        });
        this.todayBlocks.set(filtered);
        done();
      },
      error: () => {
        this.todayBlocks.set([]);
        done();
      },
    });
  }

  // ── Week loaders ────────────────────────────────────────────────────────

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
    const end = start.plus({ days: 7 });

    this.weekStats.set(null);
    this.weekBookings.set(null);

    this.bookingApi.getWeeklyStats(start.toISO()!).subscribe({
      next: (res) => this.weekStats.set(res),
    });

    this.bookingApi
      .getAllBookings({ startDate: start.toISO()!, endDate: end.toISO()! })
      .subscribe({
        next: (b) => this.weekBookings.set(b),
      });
  }

  private computeWeekStart(dt: DateTime): DateTime {
    return dt.setZone(SP_TZ).startOf('week');
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  formatTime(dt: DateTime): string {
    return dt.toFormat('HH:mm');
  }

  statusLabel(s: BookingStatus): string {
    return STATUS_LABELS[s] ?? s;
  }
  statusSeverity(s: BookingStatus): string {
    return STATUS_SEVERITY[s] ?? 'secondary';
  }
}
