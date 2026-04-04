import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { BookingSuggestion } from '@cabeleleila/contracts';
import { SpDatetimePipe } from '../../../shared/pipes/sp-datetime.pipe';

@Component({
  selector: 'app-booking-suggestion-dialog',
  standalone: true,
  imports: [DialogModule, ButtonModule, SpDatetimePipe],
  template: `
    <p-dialog
      header="Agendamento na mesma semana"
      [visible]="visible"
      (visibleChange)="dismissed.emit()"
      [modal]="true"
      [closable]="true"
      [style]="{ width: '95vw', maxWidth: '440px' }"
    >
      @if (suggestion) {
        <div class="flex flex-column gap-3">
          <p class="m-0">
            Você já possui um agendamento nesta semana
            @if (suggestion.suggestedDate) {
              para <strong>{{ suggestion.suggestedDate | spDatetime }}</strong>
            }
            .
          </p>
          <p class="m-0 text-color-secondary text-sm">
            Deseja visualizar o agendamento existente ou manter o novo?
          </p>
        </div>
      }
      <ng-template pTemplate="footer">
        <div class="flex gap-2 justify-content-end flex-wrap">
          <p-button
            label="Manter novo"
            severity="secondary"
            (onClick)="dismissed.emit()"
          />
          @if (suggestion?.existingBookingId) {
            <p-button
              label="Ver agendamento existente"
              icon="pi pi-arrow-right"
              iconPos="right"
              (onClick)="viewExisting.emit(suggestion!.existingBookingId!)"
            />
          }
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class BookingSuggestionDialogComponent {
  @Input() visible = false;
  @Input() suggestion: BookingSuggestion | null = null;
  @Output() dismissed = new EventEmitter<void>();
  @Output() viewExisting = new EventEmitter<string>();
}
