import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CardModule } from 'primeng/card';
import { SALON_NAME } from '../../core/constants/establishment';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet, CardModule],
  template: `
    <div
      class="flex align-items-center justify-content-center min-h-screen surface-ground"
    >
      <div class="w-full" style="max-width: 440px; padding: 1rem">
        <div class="text-center mb-4">
          <h1 class="text-3xl font-bold text-primary m-0">{{ salonName }}</h1>
          <p class="text-color-secondary mt-1 mb-0">
            Agende seu horário online de forma rápida e fácil
          </p>
        </div>
        <p-card>
          <router-outlet />
        </p-card>
      </div>
    </div>
  `,
})
export class AuthLayoutComponent {
  readonly salonName = SALON_NAME;
}
