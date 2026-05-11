import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DEFAULT_PAGE_SIZE } from '@cabeleleila/contracts';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import {
  TimeBlock,
  TimeBlocksApiService,
} from '../../../core/services/time-blocks-api.service';
import { SpDatetimePipe } from '../../../shared/pipes/sp-datetime.pipe';
import { toUtcISO } from '../../../shared/utils/date.utils';

@Component({
  selector: 'app-admin-time-blocks',
  standalone: true,
  imports: [
    FormsModule,
    CardModule,
    ButtonModule,
    DialogModule,
    DatePickerModule,
    InputTextModule,
    MessageModule,
    TableModule,
    TooltipModule,
    ConfirmDialogModule,
    SpDatetimePipe,
  ],
  template: `
    <div
      class="flex flex-wrap justify-content-between align-items-center gap-2 mb-3"
    >
      <div>
        <h2 class="m-0">Bloqueios de Horário</h2>
        <p class="text-color-secondary mt-1 mb-0 text-sm">
          Reserve um intervalo do dia para que clientes não consigam agendar.
        </p>
      </div>
      <p-button
        label="Bloquear horário"
        icon="pi pi-ban"
        (onClick)="openDialog()"
      />
    </div>

    <p-table
      [value]="blocks()"
      [lazy]="true"
      [paginator]="true"
      [rows]="pageSize"
      [totalRecords]="total()"
      [rowsPerPageOptions]="[10, 20, 50]"
      [loading]="loading()"
      (onLazyLoad)="onLazyLoad($event)"
      [rowHover]="true"
      responsiveLayout="stack"
      breakpoint="768px"
      currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords}"
      [showCurrentPageReport]="true"
    >
      <ng-template pTemplate="header">
        <tr>
          <th>Início</th>
          <th>Fim</th>
          <th>Motivo</th>
          <th>Ações</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-b>
        <tr>
          <td>{{ b.startsAt | spDatetime }}</td>
          <td>{{ b.endsAt | spDatetime }}</td>
          <td>{{ b.reason || '—' }}</td>
          <td>
            <p-button
              icon="pi pi-trash"
              severity="danger"
              rounded
              text
              size="small"
              pTooltip="Remover"
              (onClick)="confirmRemove(b)"
            />
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr>
          <td colspan="4" class="text-center py-6 text-color-secondary">
            Nenhum bloqueio cadastrado. Clique em "Bloquear horário" para criar.
          </td>
        </tr>
      </ng-template>
    </p-table>

    <p-dialog
      header="Bloquear horário"
      [(visible)]="dialogVisible"
      [modal]="true"
      [style]="{ width: '95vw', maxWidth: '480px' }"
    >
      <div class="flex flex-column gap-3">
        @if (formError()) {
          <p-message severity="error" [text]="formError()!" />
        }

        <div class="flex flex-column gap-1">
          <label>Início</label>
          <p-datepicker
            [(ngModel)]="startsAt"
            [showTime]="true"
            [hourFormat]="'24'"
            appendTo="body"
            placeholder="Data e hora"
            styleClass="w-full"
          />
        </div>
        <div class="flex flex-column gap-1">
          <label>Fim</label>
          <p-datepicker
            [(ngModel)]="endsAt"
            [showTime]="true"
            [hourFormat]="'24'"
            appendTo="body"
            placeholder="Data e hora"
            styleClass="w-full"
          />
        </div>
        <div class="flex flex-column gap-1">
          <label>Motivo (opcional)</label>
          <input
            pInputText
            [(ngModel)]="reason"
            placeholder="Ex: Almoço estendido, médico, folga"
            class="w-full"
          />
        </div>
        <div class="flex justify-content-end gap-2 mt-2">
          <p-button
            label="Cancelar"
            severity="secondary"
            (onClick)="closeDialog()"
          />
          <p-button
            label="Bloquear"
            icon="pi pi-ban"
            [loading]="saving()"
            [disabled]="!canSave()"
            (onClick)="save()"
          />
        </div>
      </div>
    </p-dialog>
  `,
})
export class AdminTimeBlocksComponent {
  private readonly api = inject(TimeBlocksApiService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  readonly blocks = signal<TimeBlock[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly pageSize = DEFAULT_PAGE_SIZE;

  private currentPage = 1;
  private currentLimit = DEFAULT_PAGE_SIZE;

  dialogVisible = false;
  startsAt: Date | null = null;
  endsAt: Date | null = null;
  reason = '';

  onLazyLoad(event: TableLazyLoadEvent): void {
    const first = event.first ?? 0;
    const rows = event.rows ?? DEFAULT_PAGE_SIZE;
    this.currentLimit = rows;
    this.currentPage = Math.floor(first / rows) + 1;
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api
      .listPaginated({ page: this.currentPage, limit: this.currentLimit })
      .subscribe({
        next: (res) => {
          this.blocks.set(res.data);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: () => {
          this.blocks.set([]);
          this.total.set(0);
          this.loading.set(false);
        },
      });
  }

  openDialog(): void {
    this.startsAt = null;
    this.endsAt = null;
    this.reason = '';
    this.formError.set(null);
    this.dialogVisible = true;
  }

  closeDialog(): void {
    this.dialogVisible = false;
  }

  canSave(): boolean {
    return !!this.startsAt && !!this.endsAt && this.endsAt > this.startsAt;
  }

  save(): void {
    if (!this.canSave()) return;
    this.saving.set(true);
    this.formError.set(null);

    this.api
      .create({
        startsAt: toUtcISO(this.startsAt!),
        endsAt: toUtcISO(this.endsAt!),
        reason: this.reason.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.dialogVisible = false;
          this.load();
          this.messageService.add({
            severity: 'success',
            summary: 'Bloqueio criado',
            detail: 'O horário foi bloqueado com sucesso.',
          });
        },
        error: (err) => {
          this.saving.set(false);
          this.formError.set(
            err.error?.message ?? 'Não foi possível criar o bloqueio.',
          );
        },
      });
  }

  confirmRemove(block: TimeBlock): void {
    this.confirmationService.confirm({
      message: 'Remover este bloqueio?',
      header: 'Confirmar',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Remover',
      rejectLabel: 'Manter',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.api.remove(block.id).subscribe({
          next: () => {
            this.load();
            this.messageService.add({
              severity: 'success',
              summary: 'Bloqueio removido',
              detail: '',
            });
          },
          error: () =>
            this.messageService.add({
              severity: 'error',
              summary: 'Erro',
              detail: 'Não foi possível remover.',
            }),
        });
      },
    });
  }
}
