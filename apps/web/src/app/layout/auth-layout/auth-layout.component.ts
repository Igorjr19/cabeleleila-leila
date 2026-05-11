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
      class="auth-bg flex align-items-center justify-content-center min-h-screen"
    >
      <div
        class="w-full"
        style="max-width: 440px; padding: 1rem; position: relative; z-index: 1"
      >
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
  styles: [
    `
      .auth-bg {
        position: relative;
        background-color: var(--surface-ground);
        background-image:
          radial-gradient(
            circle at 12% 18%,
            rgba(236, 72, 153, 0.08) 0,
            transparent 38%
          ),
          radial-gradient(
            circle at 88% 82%,
            rgba(236, 72, 153, 0.07) 0,
            transparent 42%
          ),
          url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'><g fill='none' stroke='%23ec4899' stroke-opacity='0.10' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'><circle cx='28' cy='30' r='5'/><circle cx='40' cy='30' r='5'/><line x1='32' y1='34' x2='90' y2='62'/><line x1='36' y1='34' x2='90' y2='58'/><path d='M118 28 l3 6 6 1 -4.5 4 1 6 -5.5 -3 -5.5 3 1 -6 -4.5 -4 6 -1z'/><path d='M30 116 l2 4 4 .6 -3 3 .8 4 -3.8 -2 -3.8 2 .8 -4 -3 -3 4 -.6z'/><path d='M118 120 c0 -6 -10 -6 -10 0 c0 6 10 12 10 12 c0 0 10 -6 10 -12 c0 -6 -10 -6 -10 0z'/><circle cx='80' cy='80' r='2.5' fill='%23ec4899' fill-opacity='0.12' stroke='none'/></g></svg>");
        background-repeat: no-repeat, no-repeat, repeat;
        background-size:
          auto,
          auto,
          160px 160px;
      }
    `,
  ],
})
export class AuthLayoutComponent {
  readonly salonName = SALON_NAME;
}
