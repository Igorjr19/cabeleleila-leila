import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import {
  CreateServiceRequest,
  ServiceResponse,
  UpdateServiceRequest,
} from '@cabeleleila/contracts';
import { ServiceApiService } from '../../../core/services/service-api.service';
import { BrlCurrencyPipe } from '../../../shared/pipes/brl-currency.pipe';

// ── Service Form (inline sub-component) ────────────────────────────────────
@Component({
  selector: 'app-service-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
    ButtonModule,
  ],
  template: `
    <form [formGroup]="form" (ngSubmit)="save()" class="flex flex-column gap-3">
      <div class="flex flex-column gap-1">
        <label>Nome</label>
        <input
          pInputText
          formControlName="name"
          class="w-full"
          placeholder="Ex: Corte de cabelo"
        />
      </div>
      <div class="flex flex-column gap-1">
        <label>Preço (R$)</label>
        <p-inputnumber
          formControlName="price"
          mode="decimal"
          [minFractionDigits]="2"
          [maxFractionDigits]="2"
          [min]="0"
          styleClass="w-full"
        />
      </div>
      <div class="flex flex-column gap-1">
        <label>Duração (minutos)</label>
        <p-inputnumber
          formControlName="durationMinutes"
          [min]="5"
          [max]="480"
          styleClass="w-full"
        />
      </div>
      <div class="flex flex-column gap-1">
        <label>Descrição (opcional)</label>
        <textarea
          pTextarea
          formControlName="description"
          rows="3"
          placeholder="Ex: Corte tradicional com lavagem e finalização."
          class="w-full"
        ></textarea>
        <small class="text-color-secondary">
          Aparece para o cliente ao escolher o serviço.
        </small>
      </div>
      <div class="flex gap-2 justify-content-end">
        <p-button
          label="Cancelar"
          severity="secondary"
          type="button"
          (onClick)="cancelled.emit()"
        />
        <p-button
          label="Salvar"
          type="submit"
          [loading]="loading()"
          [disabled]="form.invalid"
        />
      </div>
    </form>
  `,
})
export class ServiceFormComponent {
  private readonly fb = inject(FormBuilder);

  @Input() set service(s: ServiceResponse | null) {
    if (s) {
      this.form.patchValue({
        name: s.name,
        price: s.price,
        durationMinutes: s.durationMinutes,
        description: s.description ?? '',
      });
    } else {
      this.form.reset({
        name: '',
        price: 0,
        durationMinutes: 30,
        description: '',
      });
    }
  }
  @Input() loading = signal(false);
  @Output() saved = new EventEmitter<
    CreateServiceRequest | UpdateServiceRequest
  >();
  @Output() cancelled = new EventEmitter<void>();

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    price: [0, [Validators.required, Validators.min(0.01)]],
    durationMinutes: [30, [Validators.required, Validators.min(5)]],
    description: [''],
  });

  save(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    this.saved.emit({
      name: v.name!,
      price: v.price!,
      durationMinutes: v.durationMinutes!,
      description: v.description?.trim() ? v.description : null,
    });
  }
}

// ── Admin Services Page ─────────────────────────────────────────────────────
@Component({
  selector: 'app-admin-services',
  standalone: true,
  imports: [
    TableModule,
    ButtonModule,
    DialogModule,
    ConfirmDialogModule,
    TagModule,
    TooltipModule,
    BrlCurrencyPipe,
    ServiceFormComponent,
  ],
  template: `
    <div
      class="flex flex-wrap justify-content-between align-items-center gap-2 mb-3"
    >
      <h2 class="m-0">Serviços</h2>
      <p-button label="Novo Serviço" icon="pi pi-plus" (onClick)="openNew()" />
    </div>

    @if (!services()) {
      <p class="text-color-secondary">Carregando...</p>
    } @else {
      <p-table
        [value]="services()!"
        [rowHover]="true"
        responsiveLayout="stack"
        breakpoint="768px"
      >
        <ng-template pTemplate="header">
          <tr>
            <th>Nome</th>
            <th>Preço</th>
            <th>Duração</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-s>
          <tr [style.opacity]="s.active ? 1 : 0.6">
            <td>{{ s.name }}</td>
            <td>{{ s.price | brlCurrency }}</td>
            <td>{{ s.durationMinutes }} min</td>
            <td>
              <p-tag
                [value]="s.active ? 'Ativo' : 'Inativo'"
                [severity]="s.active ? 'success' : 'secondary'"
              />
            </td>
            <td>
              <div class="flex gap-1 align-items-center">
                <p-button
                  [icon]="s.active ? 'pi pi-eye-slash' : 'pi pi-eye'"
                  [pTooltip]="s.active ? 'Desativar' : 'Reativar'"
                  text
                  size="small"
                  (onClick)="toggleActive(s)"
                />
                <p-button
                  icon="pi pi-pencil"
                  pTooltip="Editar"
                  text
                  size="small"
                  (onClick)="openEdit(s)"
                />
                <p-button
                  icon="pi pi-trash"
                  pTooltip="Excluir"
                  text
                  severity="danger"
                  size="small"
                  (onClick)="confirmDelete(s)"
                />
              </div>
            </td>
          </tr>
        </ng-template>
      </p-table>
    }

    <!-- Dialog -->
    <p-dialog
      [header]="editingService ? 'Editar Serviço' : 'Novo Serviço'"
      [(visible)]="dialogVisible"
      [modal]="true"
      [style]="{ width: '95vw', maxWidth: '480px' }"
    >
      <app-service-form
        [service]="editingService"
        [loading]="formLoading"
        (saved)="onFormSaved($event)"
        (cancelled)="dialogVisible = false"
      />
    </p-dialog>
  `,
})
export class AdminServicesComponent implements OnInit {
  private readonly serviceApi = inject(ServiceApiService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  readonly services = signal<ServiceResponse[] | null>(null);
  readonly formLoading = signal(false);

  dialogVisible = false;
  editingService: ServiceResponse | null = null;

  ngOnInit(): void {
    this.loadServices();
  }

  private loadServices(): void {
    this.serviceApi.getServices().subscribe((s) => this.services.set(s));
  }

  openNew(): void {
    this.editingService = null;
    this.dialogVisible = true;
  }

  openEdit(s: ServiceResponse): void {
    this.editingService = s;
    this.dialogVisible = true;
  }

  onFormSaved(dto: CreateServiceRequest | UpdateServiceRequest): void {
    this.formLoading.set(true);
    const req = this.editingService
      ? this.serviceApi.updateService(this.editingService.id, dto)
      : this.serviceApi.createService(dto as CreateServiceRequest);

    req.subscribe({
      next: () => {
        this.formLoading.set(false);
        this.dialogVisible = false;
        this.loadServices();
        this.messageService.add({
          severity: 'success',
          summary: 'Salvo',
          detail: 'Serviço salvo com sucesso.',
        });
      },
      error: () => {
        this.formLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Não foi possível salvar.',
        });
      },
    });
  }

  toggleActive(s: ServiceResponse): void {
    this.serviceApi.setServiceActive(s.id, !s.active).subscribe({
      next: () => {
        this.loadServices();
        this.messageService.add({
          severity: 'success',
          summary: !s.active ? 'Serviço reativado' : 'Serviço desativado',
          detail: s.name,
        });
      },
      error: () =>
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Não foi possível alterar.',
        }),
    });
  }

  confirmDelete(s: ServiceResponse): void {
    this.confirmationService.confirm({
      message: `Excluir "${s.name}"? Se houver agendamentos vinculados, o serviço será desativado em vez de excluído.`,
      header: 'Confirmar exclusão',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Excluir',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.serviceApi.deleteService(s.id).subscribe({
          next: () => {
            this.loadServices();
            this.messageService.add({
              severity: 'success',
              summary: 'Removido',
              detail: `"${s.name}" não aparece mais para clientes.`,
            });
          },
          error: (err) => {
            const msg: string =
              err.error?.message ?? 'Não foi possível excluir.';
            this.messageService.add({
              severity: 'error',
              summary: 'Erro',
              detail: msg,
            });
          },
        });
      },
    });
  }
}
