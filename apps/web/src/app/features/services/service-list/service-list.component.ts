import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { ServiceApiService } from '../../../core/services/service-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { BrlCurrencyPipe } from '../../../shared/pipes/brl-currency.pipe';

@Component({
  selector: 'app-service-list',
  standalone: true,
  imports: [
    CardModule,
    ButtonModule,
    SkeletonModule,
    TagModule,
    RouterLink,
    BrlCurrencyPipe,
  ],
  template: `
    <div class="flex justify-content-between align-items-center mb-4">
      <h2 class="m-0">Serviços</h2>
      @if (isAdmin()) {
        <a
          pButton
          routerLink="/admin/services"
          label="Gerenciar Serviços"
          icon="pi pi-cog"
          severity="secondary"
        ></a>
      } @else {
        <a
          pButton
          routerLink="/bookings/new"
          label="Agendar"
          icon="pi pi-calendar-plus"
        ></a>
      }
    </div>

    @if (!services()) {
      <div class="grid">
        @for (i of [1, 2, 3, 4, 5, 6]; track i) {
          <div class="col-12 md:col-6 lg:col-4">
            <p-card><p-skeleton height="80px" /></p-card>
          </div>
        }
      </div>
    } @else if (services()!.length === 0) {
      <p class="text-color-secondary text-center py-6">
        Nenhum serviço disponível no momento.
      </p>
    } @else {
      <div class="grid">
        @for (service of services(); track service.id) {
          <div class="col-12 md:col-6 lg:col-4">
            <p-card styleClass="h-full">
              <div class="flex flex-column gap-2">
                <span class="text-lg font-semibold">{{ service.name }}</span>
                <div class="flex justify-content-between align-items-center">
                  <span class="text-2xl font-bold text-primary">{{
                    service.price | brlCurrency
                  }}</span>
                  <p-tag
                    [value]="service.durationMinutes + ' min'"
                    icon="pi pi-clock"
                    severity="secondary"
                  />
                </div>
              </div>
            </p-card>
          </div>
        }
      </div>
    }
  `,
})
export class ServiceListComponent {
  private readonly serviceApi = inject(ServiceApiService);
  readonly isAdmin = inject(AuthService).isAdmin;
  readonly services = toSignal(this.serviceApi.getServices());
}
