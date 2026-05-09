import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BookingResponse } from '@cabeleleila/contracts';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';
import { BrlCurrencyPipe } from '../../../shared/pipes/brl-currency.pipe';
import { SpDatetimePipe } from '../../../shared/pipes/sp-datetime.pipe';

export type SameWeekChoice = 'merge' | 'keep-new' | 'go-to-existing';

@Component({
  selector: 'app-booking-suggestion-dialog',
  standalone: true,
  imports: [
    DialogModule,
    ButtonModule,
    DividerModule,
    TagModule,
    SpDatetimePipe,
    BrlCurrencyPipe,
  ],
  template: `
    <p-dialog
      header="Você já tem um agendamento esta semana"
      [visible]="visible"
      (visibleChange)="dismissed.emit()"
      [modal]="true"
      [closable]="true"
      [closeOnEscape]="true"
      [style]="{ width: '95vw', maxWidth: '500px' }"
    >
      @if (existing) {
        <div class="flex flex-column gap-3">
          <p class="m-0 text-color-secondary">
            Para você não precisar voltar duas vezes ao salão, podemos juntar os
            novos serviços neste agendamento que já está marcado:
          </p>

          <div class="surface-50 border-round p-3 flex flex-column gap-2">
            <div class="flex align-items-center justify-content-between">
              <span class="text-sm text-color-secondary">DATA</span>
              <p-tag
                [value]="statusLabel(existing.status)"
                [severity]="statusSeverity(existing.status)"
              />
            </div>
            <p class="text-lg font-semibold m-0">
              {{ existing.scheduledAt | spDatetime }}
            </p>

            <p-divider styleClass="my-1" />

            <span class="text-sm text-color-secondary"
              >SERVIÇOS JÁ MARCADOS</span
            >
            @for (s of existing.services; track s.id) {
              <div class="flex justify-content-between text-sm">
                <span>{{ s.name }}</span>
                <span class="text-color-secondary">{{
                  s.price | brlCurrency
                }}</span>
              </div>
            }
          </div>

          @if (newServiceNames.length > 0) {
            <div class="flex flex-column gap-1">
              <span class="text-sm text-color-secondary">
                SE ADICIONAR AO EXISTENTE, SERÁ INCLUÍDO:
              </span>
              <span class="text-sm">{{ newServiceNames.join(', ') }}</span>
            </div>
          }
        </div>
      }

      <ng-template pTemplate="footer">
        <div class="flex flex-column gap-2 w-full">
          <p-button
            label="Adicionar ao agendamento existente"
            icon="pi pi-plus"
            styleClass="w-full"
            (onClick)="choose('merge')"
          />
          <p-button
            label="Continuar com novo agendamento"
            severity="secondary"
            styleClass="w-full"
            (onClick)="choose('keep-new')"
          />
          <p-button
            label="Ver agendamento existente"
            severity="secondary"
            text
            styleClass="w-full"
            (onClick)="choose('go-to-existing')"
          />
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class BookingSuggestionDialogComponent {
  @Input() visible = false;
  @Input() existing: BookingResponse | null = null;
  @Input() newServiceNames: string[] = [];

  @Output() dismissed = new EventEmitter<void>();
  @Output() decided = new EventEmitter<SameWeekChoice>();

  choose(choice: SameWeekChoice): void {
    this.decided.emit(choice);
  }

  statusLabel(status: string): string {
    return (
      {
        PENDING: 'Pendente',
        CONFIRMED: 'Confirmado',
        CANCELLED: 'Cancelado',
        FINISHED: 'Finalizado',
      }[status] ?? status
    );
  }

  statusSeverity(status: string): string {
    return (
      {
        PENDING: 'warn',
        CONFIRMED: 'success',
        CANCELLED: 'danger',
        FINISHED: 'secondary',
      }[status] ?? 'secondary'
    );
  }
}
