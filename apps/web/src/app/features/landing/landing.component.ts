import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { AuthService } from '../../core/services/auth.service';
import { SALON_NAME } from '../../core/constants/establishment';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, ButtonModule, CardModule],
  template: `
    <div class="landing-wrapper">
      <!-- Hero -->
      <section class="hero text-center px-3 py-6 md:py-8">
        <div class="inline-block px-3 py-1 border-round-3xl surface-100 mb-3">
          <span class="text-sm text-primary font-semibold">
            <i class="pi pi-sparkles mr-1"></i>
            Agendamento online sem complicação
          </span>
        </div>
        <h1
          class="text-4xl md:text-6xl font-bold m-0 mb-3"
          style="line-height: 1.1"
        >
          Bem-vinda ao
          <span class="text-primary">{{ salonName }}</span>
        </h1>
        <p
          class="text-xl text-color-secondary max-w-30rem mx-auto m-0 mb-5"
          style="line-height: 1.5"
        >
          Reserve seu horário com a Leila em poucos cliques, escolha seus
          serviços favoritos e a gente cuida do resto.
        </p>

        <div class="flex gap-3 justify-content-center flex-wrap">
          <p-button
            label="Agendar agora"
            icon="pi pi-calendar-plus"
            size="large"
            (onClick)="goToBooking()"
          />
          @if (!isAuthenticated()) {
            <p-button
              label="Já tenho conta"
              icon="pi pi-sign-in"
              severity="secondary"
              outlined
              size="large"
              (onClick)="goToLogin()"
            />
          } @else {
            <p-button
              label="Meus agendamentos"
              icon="pi pi-list"
              severity="secondary"
              outlined
              size="large"
              routerLink="/bookings"
            />
          }
        </div>
      </section>

      <!-- Como funciona -->
      <section class="px-3 py-6">
        <h2 class="text-center text-2xl md:text-3xl font-bold mb-1">
          Como funciona
        </h2>
        <p class="text-center text-color-secondary mb-5 m-0">
          Três passos simples para se cuidar com a Leila.
        </p>
        <div class="grid max-w-60rem mx-auto">
          @for (step of steps; track step.title; let i = $index) {
            <div class="col-12 md:col-4">
              <p-card styleClass="h-full text-center step-card">
                <div class="flex flex-column align-items-center gap-3">
                  <div class="step-icon">
                    <i [class]="step.icon"></i>
                  </div>
                  <div class="flex flex-column gap-2">
                    <h3 class="text-lg font-semibold m-0">
                      {{ i + 1 }}. {{ step.title }}
                    </h3>
                    <p class="text-color-secondary m-0 text-sm line-height-3">
                      {{ step.description }}
                    </p>
                  </div>
                </div>
              </p-card>
            </div>
          }
        </div>
      </section>

      <!-- Diferenciais -->
      <section class="px-3 py-6">
        <div class="max-w-60rem mx-auto">
          <h2 class="text-center text-2xl md:text-3xl font-bold mb-1">
            Por que agendar online?
          </h2>
          <p class="text-center text-color-secondary mb-5 m-0">
            Tudo pensado para você ganhar tempo e tranquilidade.
          </p>

          <div class="grid">
            @for (item of perks; track item.title) {
              <div class="col-12 md:col-6">
                <p-card styleClass="h-full perk-card">
                  <div class="flex align-items-start gap-3">
                    <div class="perk-icon flex-shrink-0">
                      <i [class]="item.icon"></i>
                    </div>
                    <div class="flex flex-column gap-1">
                      <h3 class="text-base font-semibold m-0">
                        {{ item.title }}
                      </h3>
                      <p class="text-color-secondary m-0 text-sm line-height-3">
                        {{ item.description }}
                      </p>
                    </div>
                  </div>
                </p-card>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- Final CTA -->
      <section class="px-3 py-6 text-center">
        <h2 class="text-2xl md:text-3xl font-bold m-0 mb-3">
          Pronta para se cuidar?
        </h2>
        <p class="text-color-secondary mb-4">
          Comece seu agendamento agora — leva menos de 1 minuto.
        </p>
        <p-button
          label="Começar agendamento"
          icon="pi pi-arrow-right"
          iconPos="right"
          size="large"
          (onClick)="goToBooking()"
        />
      </section>
    </div>
  `,
  styles: [
    `
      .landing-wrapper {
        margin: -1rem -0.75rem;
      }
      .hero {
        background: linear-gradient(
          135deg,
          var(--surface-50) 0%,
          var(--surface-100) 100%
        );
      }
      .step-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 3.5rem;
        height: 3.5rem;
        border-radius: 50%;
        background: var(--primary-color);
        color: var(--primary-color-text);
        font-size: 1.5rem;
      }
      .perk-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2.75rem;
        height: 2.75rem;
        border-radius: 0.75rem;
        background: var(--primary-50, #fef2f4);
        color: var(--primary-color);
        font-size: 1.25rem;
      }
      :host ::ng-deep .perk-card .p-card-body {
        padding: 1.25rem;
      }
      :host ::ng-deep .perk-card .p-card-content {
        padding: 0;
      }
    `,
  ],
})
export class LandingComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  readonly salonName = SALON_NAME;
  readonly isAuthenticated = this.auth.isAuthenticated;

  readonly steps = [
    {
      icon: 'pi pi-list',
      title: 'Escolha os serviços',
      description:
        'Veja o catálogo completo com descrições, preços e duração. Adicione quantos quiser num único agendamento.',
    },
    {
      icon: 'pi pi-clock',
      title: 'Selecione o horário',
      description:
        'Veja em tempo real os horários disponíveis e escolha o que melhor encaixa na sua agenda.',
    },
    {
      icon: 'pi pi-check-circle',
      title: 'Pronto!',
      description:
        'A Leila confirma seu agendamento e você acompanha tudo pelo seu histórico. Sem cadastro chato antes de começar.',
    },
  ];

  readonly perks = [
    {
      icon: 'pi pi-bolt',
      title: 'Rápido e sem ligações',
      description:
        'Em menos de 1 minuto seu horário está marcado, sem precisar ligar e esperar atender.',
    },
    {
      icon: 'pi pi-shield',
      title: 'Disponibilidade garantida',
      description:
        'Você só vê horários realmente livres — sem risco de marcar e receber ligação cancelando depois.',
    },
    {
      icon: 'pi pi-pencil',
      title: 'Alteração fácil',
      description:
        'Mudou de planos? Edite ou cancele pelo próprio sistema, até 2 dias antes.',
    },
    {
      icon: 'pi pi-heart',
      title: 'Combos com desconto',
      description:
        'Aproveite pacotes especiais (Corte + Hidratação, Dia da Noiva) com preços menores que avulsos.',
    },
  ];

  goToBooking(): void {
    this.router.navigate(['/bookings/new']);
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}
