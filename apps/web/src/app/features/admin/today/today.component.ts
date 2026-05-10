import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BookingResponse, BookingStatus } from '@cabeleleila/contracts';
import { DateTime } from 'luxon';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { BookingApiService } from '../../../core/services/booking-api.service';
import {
  TimeBlock,
  TimeBlocksApiService,
} from '../../../core/services/time-blocks-api.service';
import { BrlCurrencyPipe } from '../../../shared/pipes/brl-currency.pipe';
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
  selector: 'app-admin-today',
  standalone: true,
  imports: [
    CardModule,
    ButtonModule,
    TagModule,
    TooltipModule,
    DividerModule,
    SkeletonModule,
    BrlCurrencyPipe,
  ],
  template: `
    <div class="flex flex-column gap-4">
      <div
        class="flex justify-content-between align-items-center flex-wrap gap-2"
      >
        <div>
          <h2 class="m-0">Hoje</h2>
          <p class="text-color-secondary mt-1 mb-0">
            {{ todayLabel() }}
          </p>
        </div>
        <p-button
          label="Bloquear horário"
          icon="pi pi-ban"
          severity="secondary"
          outlined
          (onClick)="router.navigate(['/admin/time-blocks'])"
        />
      </div>

      <!-- Quick stats -->
      <div class="grid">
        <div class="col-6 md:col-3">
          <p-card styleClass="text-center">
            <div class="text-3xl font-bold">{{ totalToday() }}</div>
            <div class="text-color-secondary mt-1 text-sm">Agendamentos</div>
          </p-card>
        </div>
        <div class="col-6 md:col-3">
          <p-card styleClass="text-center">
            <div class="text-3xl font-bold text-orange-500">
              {{ pendingToday() }}
            </div>
            <div class="text-color-secondary mt-1 text-sm">Pendentes</div>
          </p-card>
        </div>
        <div class="col-6 md:col-3">
          <p-card styleClass="text-center">
            <div class="text-3xl font-bold text-green-500">
              {{ confirmedToday() }}
            </div>
            <div class="text-color-secondary mt-1 text-sm">Confirmados</div>
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

        @if (loading()) {
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
                      <div class="text-2xl font-bold" style="min-width: 4.5rem">
                        {{ formatTime(item.startsAt) }}
                      </div>
                      <div class="flex flex-column gap-1">
                        <span class="font-semibold">{{ b.customerName }}</span>
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
  `,
})
export class AdminTodayComponent implements OnInit {
  readonly router = inject(Router);
  private readonly bookingApi = inject(BookingApiService);
  private readonly timeBlocksApi = inject(TimeBlocksApiService);

  readonly loading = signal(true);
  readonly bookings = signal<BookingResponse[]>([]);
  readonly blocks = signal<TimeBlock[]>([]);

  readonly todayLabel = signal(
    DateTime.now()
      .setZone(SP_TZ)
      .setLocale('pt-BR')
      .toFormat("cccc, dd 'de' LLLL"),
  );

  readonly timeline = computed<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];

    for (const b of this.bookings()) {
      // Skip cancelled bookings from today's view — they don't occupy the agenda
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

    for (const bl of this.blocks()) {
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
      this.bookings().filter((b) => b.status !== BookingStatus.CANCELLED)
        .length,
  );
  readonly pendingToday = computed(
    () =>
      this.bookings().filter((b) => b.status === BookingStatus.PENDING).length,
  );
  readonly confirmedToday = computed(
    () =>
      this.bookings().filter((b) => b.status === BookingStatus.CONFIRMED)
        .length,
  );
  readonly revenueToday = computed(() =>
    this.bookings()
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

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    const startOfDay = DateTime.now().setZone(SP_TZ).startOf('day');
    const endOfDay = startOfDay.plus({ days: 1 });

    let pendingCalls = 2;
    const done = () => {
      pendingCalls--;
      if (pendingCalls === 0) this.loading.set(false);
    };

    this.bookingApi
      .getAllBookings({
        startDate: startOfDay.toISO()!,
        endDate: endOfDay.toISO()!,
      })
      .subscribe({
        next: (b) => {
          this.bookings.set(b);
          done();
        },
        error: () => {
          this.bookings.set([]);
          done();
        },
      });

    this.timeBlocksApi.list().subscribe({
      next: (blocks) => {
        // Filter to today only
        const filtered = blocks.filter((bl) => {
          const blStart = DateTime.fromISO(bl.startsAt, { zone: 'utc' });
          return blStart < endOfDay && blStart >= startOfDay;
        });
        this.blocks.set(filtered);
        done();
      },
      error: () => {
        this.blocks.set([]);
        done();
      },
    });
  }

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
