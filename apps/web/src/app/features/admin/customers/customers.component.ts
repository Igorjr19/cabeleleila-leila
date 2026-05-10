import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import {
  CustomerWithStats,
  UserApiService,
} from '../../../core/services/user-api.service';
import { BrlCurrencyPipe } from '../../../shared/pipes/brl-currency.pipe';
import { SpDatetimePipe } from '../../../shared/pipes/sp-datetime.pipe';

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
          {{ customers().length }} cliente(s) cadastrado(s).
        </p>
      </div>

      <div class="grid">
        <div class="col-12 sm:col-6 lg:col-3">
          <p-card styleClass="text-center">
            <div class="text-3xl font-bold">{{ totalCustomers() }}</div>
            <div class="text-color-secondary mt-1 text-sm">Cadastrados</div>
          </p-card>
        </div>
        <div class="col-12 sm:col-6 lg:col-3">
          <p-card styleClass="text-center">
            <div class="text-3xl font-bold text-green-500">
              {{ activeCustomers() }}
            </div>
            <div class="text-color-secondary mt-1 text-sm">
              Com agendamentos
            </div>
          </p-card>
        </div>
        <div class="col-12 sm:col-6 lg:col-3">
          <p-card styleClass="text-center">
            <div class="text-3xl font-bold text-orange-500">
              {{ inactive30Days() }}
            </div>
            <div class="text-color-secondary mt-1 text-sm">
              Sem agendar há pelo menos 30 dias
            </div>
          </p-card>
        </div>
        <div class="col-12 sm:col-6 lg:col-3">
          <p-card styleClass="text-center">
            <div class="text-3xl font-bold text-primary">
              {{ averageTicketAll() | brlCurrency }}
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
          (ngModelChange)="filterText.set($event)"
          placeholder="Filtrar por nome, e-mail ou telefone"
          class="w-full"
        />
      </p-iconfield>

      @if (loading()) {
        <p class="text-color-secondary">Carregando...</p>
      } @else if (filteredCustomers().length === 0) {
        <p class="text-color-secondary text-center py-6">
          Nenhum cliente encontrado.
        </p>
      } @else {
        <p-table
          [value]="filteredCustomers()"
          [rowHover]="true"
          responsiveLayout="stack"
          breakpoint="768px"
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
        </p-table>
      }
    </div>
  `,
})
export class AdminCustomersComponent implements OnInit {
  private readonly userApi = inject(UserApiService);

  readonly loading = signal(true);
  readonly customers = signal<CustomerWithStats[]>([]);
  readonly filterText = signal('');

  readonly filteredCustomers = computed(() => {
    const term = this.filterText().trim().toLowerCase();
    // TODO - Não filtrar a lista retornada. Corrigir endpoint para ser paginado e permitir esse filtro.
    if (!term) return this.customers();
    return this.customers().filter((c) => {
      return (
        c.name.toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term) ||
        (c.phone ?? '').toLowerCase().includes(term)
      );
    });
  });

  readonly totalCustomers = computed(() => this.customers().length);
  readonly activeCustomers = computed(
    () => this.customers().filter((c) => c.totalBookings > 0).length,
  );
  readonly inactive30Days = computed(
    () => this.customers().filter((c) => this.isInactive30Days(c)).length,
  );
  readonly averageTicketAll = computed(() => {
    const withBookings = this.customers().filter((c) => c.totalBookings > 0);
    if (withBookings.length === 0) return 0;
    const total = withBookings.reduce((sum, c) => sum + c.totalSpent, 0);
    const totalBookings = withBookings.reduce(
      (sum, c) => sum + c.totalBookings,
      0,
    );
    return totalBookings > 0 ? total / totalBookings : 0;
  });

  ngOnInit(): void {
    this.userApi.listCustomers().subscribe({
      next: (cs) => {
        this.customers.set(cs);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
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
