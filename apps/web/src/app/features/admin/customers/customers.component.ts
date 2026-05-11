import { DecimalPipe } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DEFAULT_PAGE_SIZE } from '@cabeleleila/contracts';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import {
  CustomersSummary,
  CustomerWithStats,
  UserApiService,
} from '../../../core/services/user-api.service';
import { BrlCurrencyPipe } from '../../../shared/pipes/brl-currency.pipe';
import { SpDatetimePipe } from '../../../shared/pipes/sp-datetime.pipe';

const EMPTY_SUMMARY: CustomersSummary = {
  totalCustomers: 0,
  activeCustomers: 0,
  inactive30Days: 0,
  averageTicket: 0,
};

@Component({
  selector: 'app-admin-customers',
  standalone: true,
  imports: [
    FormsModule,
    DecimalPipe,
    CardModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    TagModule,
    BrlCurrencyPipe,
    SpDatetimePipe,
  ],
  template: `
    <div class="flex flex-column gap-4">
      <div>
        <h2 class="m-0">Clientes</h2>
        <p class="text-color-secondary mt-1 mb-0 text-sm">
          {{ summary().totalCustomers }} cliente(s) cadastrado(s).
        </p>
      </div>

      <div class="grid">
        <div class="col-12 sm:col-6 lg:col-3">
          <p-card styleClass="text-center">
            <div class="text-3xl font-bold">{{ summary().totalCustomers }}</div>
            <div class="text-color-secondary mt-1 text-sm">Cadastrados</div>
          </p-card>
        </div>
        <div class="col-12 sm:col-6 lg:col-3">
          <p-card styleClass="text-center">
            <div class="text-3xl font-bold text-green-500">
              {{ summary().activeCustomers }}
            </div>
            <div class="text-color-secondary mt-1 text-sm">
              Com agendamentos
            </div>
          </p-card>
        </div>
        <div class="col-12 sm:col-6 lg:col-3">
          <p-card styleClass="text-center">
            <div class="text-3xl font-bold text-orange-500">
              {{ summary().inactive30Days }}
            </div>
            <div class="text-color-secondary mt-1 text-sm">
              Sem agendar há 30+ dias
            </div>
          </p-card>
        </div>
        <div class="col-12 sm:col-6 lg:col-3">
          <p-card styleClass="text-center">
            <div class="text-3xl font-bold text-primary">
              {{ summary().averageTicket | brlCurrency }}
            </div>
            <div class="text-color-secondary mt-1 text-sm">Ticket médio</div>
          </p-card>
        </div>
      </div>

      <p-iconfield iconPosition="left" styleClass="w-full">
        <p-inputicon class="pi pi-search" />
        <input
          pInputText
          type="text"
          [ngModel]="filterText()"
          (ngModelChange)="onSearchInput($event)"
          placeholder="Filtrar por nome, e-mail ou telefone"
          class="w-full"
        />
      </p-iconfield>

      <p-table
        [value]="customers()"
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
            <th>Cliente</th>
            <th>Contato</th>
            <th>Último agendamento</th>
            <th class="text-right">Total gasto</th>
            <th class="text-right">Ticket médio</th>
            <th class="text-right">Agendamentos</th>
            <th class="text-right">Serviços / Agendamento</th>
            <th class="text-right">Duração média</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-c>
          <tr>
            <td>
              <div class="font-medium">{{ c.name }}</div>
            </td>
            <td>
              <div class="flex flex-column gap-1 text-sm">
                <span>{{ c.email }}</span>
                @if (c.phone) {
                  <span class="text-color-secondary">{{ c.phone }}</span>
                }
              </div>
            </td>
            <td>
              @if (c.lastBookingAt) {
                {{ c.lastBookingAt | spDatetime }}
                @if (isInactive30Days(c)) {
                  <p-tag value="Inativo" severity="warn" styleClass="ml-1" />
                }
              } @else {
                <span class="text-color-secondary">Nunca agendou</span>
              }
            </td>
            <td class="text-right font-semibold">
              {{ c.totalSpent | brlCurrency }}
            </td>
            <td class="text-right">{{ c.averageTicket | brlCurrency }}</td>
            <td class="text-right">{{ c.totalBookings }}</td>
            <td class="text-right">
              @if (c.totalBookings > 0) {
                {{ c.averageServicesPerBooking | number: '1.1-1' }}
              } @else {
                <span class="text-color-secondary">—</span>
              }
            </td>
            <td class="text-right">
              @if (c.totalBookings > 0) {
                {{ formatDuration(c.averageDurationMinutes) }}
              } @else {
                <span class="text-color-secondary">—</span>
              }
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="8" class="text-center py-6 text-color-secondary">
              Nenhum cliente encontrado.
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>
  `,
})
export class AdminCustomersComponent implements OnInit, OnDestroy {
  private readonly userApi = inject(UserApiService);

  readonly loading = signal(false);
  readonly customers = signal<CustomerWithStats[]>([]);
  readonly total = signal(0);
  readonly summary = signal<CustomersSummary>(EMPTY_SUMMARY);
  readonly filterText = signal('');
  readonly pageSize = DEFAULT_PAGE_SIZE;

  private currentPage = 1;
  private currentLimit = DEFAULT_PAGE_SIZE;
  private searchDebounce: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    // first load happens via onLazyLoad triggered by the table init
  }

  ngOnDestroy(): void {
    if (this.searchDebounce !== null) {
      clearTimeout(this.searchDebounce);
    }
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    const first = event.first ?? 0;
    const rows = event.rows ?? DEFAULT_PAGE_SIZE;
    this.currentLimit = rows;
    this.currentPage = Math.floor(first / rows) + 1;
    this.reload();
  }

  onSearchInput(value: string): void {
    this.filterText.set(value);
    if (this.searchDebounce !== null) {
      clearTimeout(this.searchDebounce);
    }
    this.searchDebounce = setTimeout(() => {
      this.currentPage = 1;
      this.reload();
    }, 300);
  }

  private reload(): void {
    this.loading.set(true);
    this.userApi
      .listCustomers({
        search: this.filterText().trim() || undefined,
        page: this.currentPage,
        limit: this.currentLimit,
      })
      .subscribe({
        next: (res) => {
          this.customers.set(res.data);
          this.total.set(res.total);
          this.summary.set(res.summary);
          this.loading.set(false);
        },
        error: () => {
          this.customers.set([]);
          this.total.set(0);
          this.summary.set(EMPTY_SUMMARY);
          this.loading.set(false);
        },
      });
  }

  isInactive30Days(c: CustomerWithStats): boolean {
    if (!c.lastBookingAt) return false;
    const last = new Date(c.lastBookingAt).getTime();
    return Date.now() - last > 30 * 86_400_000;
  }

  formatDuration(minutes: number): string {
    const total = Math.round(minutes);
    if (total < 60) return `${total}min`;
    const h = Math.floor(total / 60);
    const m = total % 60;
    return m === 0 ? `${h}h` : `${h}h${m.toString().padStart(2, '0')}`;
  }
}
