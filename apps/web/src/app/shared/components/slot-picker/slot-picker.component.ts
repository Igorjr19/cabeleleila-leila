import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AvailabilityResponse,
  AvailabilitySlot,
  SlotUnavailableReason,
} from '@cabeleleila/contracts';
import { DateTime } from 'luxon';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { BookingApiService } from '../../../core/services/booking-api.service';
import { SP_TZ } from '../../utils/date.utils';

const REASON_TOOLTIP: Record<SlotUnavailableReason, string> = {
  PAST: 'Horário já passou',
  TOO_SOON: 'Antecedência mínima não atendida — ligue para o salão',
  LUNCH: 'Conflita com o horário de almoço',
  OCCUPIED: 'Já existe agendamento neste horário',
  CLOSING: 'O serviço terminaria depois do fechamento',
  CLOSED: 'Salão fechado',
  BLOCKED: 'Salão indisponível neste horário',
};

@Component({
  selector: 'app-slot-picker',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    DatePickerModule,
    MessageModule,
    SkeletonModule,
    TooltipModule,
  ],
  template: `
    <div class="flex flex-column gap-3">
      <div class="flex flex-column gap-1">
        <label class="font-medium">Data</label>
        <p-datepicker
          [(ngModel)]="selectedDay"
          [minDate]="minDate"
          [disabledDays]="closedDays"
          [showButtonBar]="true"
          [appendTo]="appendTo"
          placeholder="Selecione uma data"
          styleClass="w-full"
          (onSelect)="onDayPicked()"
          (onClear)="onDayCleared()"
        />
        @if (closedDayLabels.length > 0) {
          <small class="text-color-secondary">
            Salão fechado: {{ closedDayLabels.join(', ') }}.
          </small>
        }
      </div>

      @if (loadingAvailability()) {
        <div class="grid">
          @for (i of skeletonRows; track $index) {
            <div class="col-4 md:col-3 lg:col-2">
              <p-skeleton height="2.5rem" />
            </div>
          }
        </div>
      }
      @if (!loadingAvailability() && availability(); as av) {
        @if (!av.isOpen) {
          <p-message
            severity="info"
            text="Salão fechado neste dia. Escolha outra data."
          />
        } @else if (av.slots.length === 0) {
          <p-message
            severity="warn"
            text="O total de serviços selecionados é maior que a janela de funcionamento. Reduza serviços ou escolha outro dia."
          />
        } @else {
          <div class="flex flex-column gap-2">
            <div
              class="flex justify-content-between align-items-center flex-wrap gap-2"
            >
              <span class="text-sm text-color-secondary">
                Atendimento: {{ av.openTime }}–{{ av.closeTime }}
                @if (av.lunchStart && av.lunchEnd) {
                  (almoço {{ av.lunchStart }}–{{ av.lunchEnd }})
                }
              </span>
              <span class="text-sm text-color-secondary">
                {{ durationMinutes }} min
              </span>
            </div>

            @if (!hasAnyAvailable(av.slots)) {
              <p-message
                severity="warn"
                text="Sem horários disponíveis neste dia. Tente outra data."
              />
            }

            <div class="grid">
              @for (slot of av.slots; track slot.startsAt) {
                <div class="col-4 md:col-3 lg:col-2">
                  <p-button
                    [label]="slot.time"
                    severity="primary"
                    [outlined]="!isSlotSelected(slot)"
                    [disabled]="!slot.available"
                    [pTooltip]="slotTooltip(slot)"
                    tooltipPosition="top"
                    styleClass="w-full"
                    (onClick)="pickSlot(slot)"
                  />
                </div>
              }
            </div>

            <div class="flex flex-wrap gap-3 mt-1 align-items-center">
              <span
                class="flex align-items-center gap-2 text-xs text-color-secondary"
              >
                <p-button
                  label="hh:mm"
                  severity="primary"
                  outlined
                  size="small"
                  [styleClass]="'pointer-events-none'"
                />
                Disponível
              </span>
              <span
                class="flex align-items-center gap-2 text-xs text-color-secondary"
              >
                <p-button
                  label="hh:mm"
                  severity="primary"
                  outlined
                  disabled
                  size="small"
                  [styleClass]="'pointer-events-none'"
                />
                Indisponível (passe o mouse para ver o motivo)
              </span>
            </div>
          </div>
        }
      }
    </div>
  `,
})
export class SlotPickerComponent implements OnInit, OnChanges {
  private readonly bookingApi = inject(BookingApiService);

  @Input() durationMinutes = 0;
  @Input() minDate: Date = new Date();
  @Input() closedDays: number[] = [];
  @Input() closedDayLabels: string[] = [];
  /** When set, pre-selects the date and slot of an existing scheduled booking. */
  @Input() initialScheduledAt: string | null = null;
  /** When set, conflict check excludes this booking. */
  @Input() excludeBookingId: string | null = null;
  /** Where to render the datepicker overlay (e.g. `'body'` when inside a dialog). */
  @Input() appendTo: 'body' | null = null;

  @Output() slotChange = new EventEmitter<AvailabilitySlot | null>();

  readonly availability = signal<AvailabilityResponse | null>(null);
  readonly loadingAvailability = signal(false);
  readonly selectedSlot = signal<AvailabilitySlot | null>(null);

  selectedDay: Date | null = null;
  readonly skeletonRows = Array.from({ length: 12 });

  ngOnInit(): void {
    this.applyInitial();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['initialScheduledAt'] &&
      !changes['initialScheduledAt'].firstChange
    ) {
      this.applyInitial();
    }
    // Reload slots when duration changes (e.g. customer added a service mid-edit)
    if (
      changes['durationMinutes'] &&
      !changes['durationMinutes'].firstChange &&
      this.selectedDay
    ) {
      this.loadAvailability();
    }
  }

  private applyInitial(): void {
    if (this.initialScheduledAt) {
      const dt = DateTime.fromISO(this.initialScheduledAt, {
        zone: 'utc',
      }).setZone(SP_TZ);
      this.selectedDay = dt
        .startOf('day')
        .setZone('local', { keepLocalTime: true })
        .toJSDate();
      this.loadAvailability(dt.toISO()!);
    }
  }

  onDayPicked(): void {
    this.setSlot(null);
    if (!this.selectedDay) {
      this.availability.set(null);
      return;
    }
    this.loadAvailability();
  }

  onDayCleared(): void {
    this.selectedDay = null;
    this.setSlot(null);
    this.availability.set(null);
  }

  private loadAvailability(preferStartsAt?: string): void {
    if (!this.selectedDay) return;
    const isoDate = DateTime.fromJSDate(this.selectedDay).toFormat(
      'yyyy-MM-dd',
    );
    this.loadingAvailability.set(true);
    this.availability.set(null);

    this.bookingApi
      .getAvailability(
        isoDate,
        this.durationMinutes,
        this.excludeBookingId ?? undefined,
      )
      .subscribe({
        next: (res) => {
          this.loadingAvailability.set(false);
          this.availability.set(res);
          if (preferStartsAt) {
            const match = res.slots.find((s) => s.startsAt === preferStartsAt);
            if (match) this.setSlot(match);
          }
        },
        error: () => {
          this.loadingAvailability.set(false);
        },
      });
  }

  hasAnyAvailable(slots: AvailabilitySlot[]): boolean {
    return slots.some((s) => s.available);
  }

  pickSlot(slot: AvailabilitySlot): void {
    if (!slot.available) return;
    this.setSlot(slot);
  }

  private setSlot(slot: AvailabilitySlot | null): void {
    this.selectedSlot.set(slot);
    this.slotChange.emit(slot);
  }

  isSlotSelected(slot: AvailabilitySlot): boolean {
    return this.selectedSlot()?.startsAt === slot.startsAt;
  }

  slotTooltip(slot: AvailabilitySlot): string {
    if (slot.available) return '';
    return slot.reason ? REASON_TOOLTIP[slot.reason] : 'Indisponível';
  }
}
