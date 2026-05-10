import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ServiceResponse } from '@cabeleleila/contracts';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';
import { BrlCurrencyPipe } from '../../pipes/brl-currency.pipe';

@Component({
  selector: 'app-service-detail-dialog',
  standalone: true,
  imports: [
    DialogModule,
    ButtonModule,
    DividerModule,
    TagModule,
    BrlCurrencyPipe,
  ],
  template: `
    <p-dialog
      [header]="service?.name ?? ''"
      [visible]="visible"
      (visibleChange)="dismissed.emit()"
      [modal]="true"
      [closable]="true"
      [closeOnEscape]="true"
      [style]="{ width: '95vw', maxWidth: '500px' }"
    >
      @if (service) {
        <div class="flex flex-column gap-3">
          <div class="flex justify-content-between align-items-center">
            <span class="text-3xl font-bold text-primary">
              {{ service.price | brlCurrency }}
            </span>
            <p-tag
              [value]="service.durationMinutes + ' min'"
              icon="pi pi-clock"
              severity="secondary"
            />
          </div>

          @if (service.description) {
            <p-divider styleClass="my-1" />
            <div>
              <p class="text-xs font-semibold text-color-secondary m-0 mb-1">
                SOBRE ESTE SERVIÇO
              </p>
              <p class="m-0" style="white-space: pre-wrap; line-height: 1.5">
                {{ service.description }}
              </p>
            </div>
          } @else {
            <p class="text-color-secondary text-sm m-0">
              Sem descrição cadastrada para este serviço.
            </p>
          }
        </div>
      }

      <ng-template pTemplate="footer">
        <div class="flex gap-2 justify-content-end">
          <p-button
            label="Fechar"
            severity="secondary"
            (onClick)="dismissed.emit()"
          />
          @if (showBookCta) {
            <p-button
              label="Agendar este serviço"
              icon="pi pi-calendar-plus"
              (onClick)="bookRequested.emit(service!)"
            />
          }
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class ServiceDetailDialogComponent {
  @Input() visible = false;
  @Input() service: ServiceResponse | null = null;
  @Input() showBookCta = false;

  @Output() dismissed = new EventEmitter<void>();
  @Output() bookRequested = new EventEmitter<ServiceResponse>();
}
