import { Component, inject } from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MenubarModule } from 'primeng/menubar';
import { ToastModule } from 'primeng/toast';
import { SALON_NAME } from '../../core/constants/establishment';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ButtonModule,
    MenubarModule,
    ToastModule,
    ConfirmDialogModule,
  ],
  template: `
    <p-toast />
    <p-confirmdialog />

    <div class="flex flex-column min-h-screen">
      <!-- Top bar -->
      <header
        class="surface-card border-bottom-1 surface-border px-3 py-2 flex align-items-center justify-content-between"
      >
        <span class="text-xl font-bold text-primary">{{ salonName }}</span>

        <nav class="hidden md:flex gap-2 align-items-center">
          @if (!isAuthenticated()) {
            <a
              pButton
              text
              routerLink="/services"
              routerLinkActive="p-button-outlined"
              label="Serviços"
              size="small"
            ></a>
            <a
              pButton
              routerLink="/bookings/new"
              label="Agendar"
              icon="pi pi-calendar-plus"
              size="small"
            ></a>
            <a
              pButton
              text
              routerLink="/auth/login"
              label="Entrar"
              size="small"
            ></a>
          } @else if (isAdmin()) {
            <a
              pButton
              text
              routerLink="/admin/dashboard"
              routerLinkActive="p-button-outlined"
              label="Painel"
            ></a>
            <a
              pButton
              text
              routerLink="/admin/bookings"
              routerLinkActive="p-button-outlined"
              label="Agendamentos"
            ></a>
            <a
              pButton
              text
              routerLink="/admin/customers"
              routerLinkActive="p-button-outlined"
              label="Clientes"
            ></a>
            <a
              pButton
              text
              routerLink="/admin/services"
              routerLinkActive="p-button-outlined"
              label="Serviços"
            ></a>
            <a
              pButton
              text
              routerLink="/admin/time-blocks"
              routerLinkActive="p-button-outlined"
              label="Bloqueios"
            ></a>
            <a
              pButton
              text
              routerLink="/admin/establishment"
              routerLinkActive="p-button-outlined"
              label="Configurações"
            ></a>
          } @else {
            <a
              pButton
              text
              routerLink="/services"
              routerLinkActive="p-button-outlined"
              label="Serviços"
            ></a>
            <a
              pButton
              text
              routerLink="/bookings"
              routerLinkActive="p-button-outlined"
              label="Agendamentos"
            ></a>
            <a
              pButton
              text
              routerLink="/profile"
              routerLinkActive="p-button-outlined"
              label="Perfil"
            ></a>
          }
          @if (isAuthenticated()) {
            <p-button
              label="Sair"
              severity="secondary"
              size="small"
              (onClick)="logout()"
            />
          }
        </nav>

        <!-- Mobile menu button -->
        <div class="md:hidden">
          <p-button
            icon="pi pi-bars"
            text
            (onClick)="mobileMenuOpen = !mobileMenuOpen"
          />
        </div>
      </header>

      <!-- Mobile dropdown menu -->
      @if (mobileMenuOpen) {
        <div class="surface-card border-bottom-1 surface-border md:hidden">
          <div class="flex flex-column p-2 gap-1">
            @if (!isAuthenticated()) {
              <a
                pButton
                text
                class="w-full justify-content-start"
                routerLink="/services"
                label="Serviços"
                (click)="mobileMenuOpen = false"
              ></a>
              <a
                pButton
                class="w-full justify-content-start"
                routerLink="/bookings/new"
                label="Agendar"
                icon="pi pi-calendar-plus"
                (click)="mobileMenuOpen = false"
              ></a>
              <a
                pButton
                text
                class="w-full justify-content-start"
                routerLink="/auth/login"
                label="Entrar"
                (click)="mobileMenuOpen = false"
              ></a>
            } @else if (isAdmin()) {
              <a
                pButton
                text
                class="w-full justify-content-start"
                routerLink="/admin/dashboard"
                label="Painel"
                (click)="mobileMenuOpen = false"
              ></a>
              <a
                pButton
                text
                class="w-full justify-content-start"
                routerLink="/admin/bookings"
                label="Agendamentos"
                (click)="mobileMenuOpen = false"
              ></a>
              <a
                pButton
                text
                class="w-full justify-content-start"
                routerLink="/admin/customers"
                label="Clientes"
                (click)="mobileMenuOpen = false"
              ></a>
              <a
                pButton
                text
                class="w-full justify-content-start"
                routerLink="/admin/services"
                label="Serviços"
                (click)="mobileMenuOpen = false"
              ></a>
              <a
                pButton
                text
                class="w-full justify-content-start"
                routerLink="/admin/time-blocks"
                label="Bloqueios"
                (click)="mobileMenuOpen = false"
              ></a>
              <a
                pButton
                text
                class="w-full justify-content-start"
                routerLink="/admin/establishment"
                label="Configurações"
                (click)="mobileMenuOpen = false"
              ></a>
            } @else {
              <a
                pButton
                text
                class="w-full justify-content-start"
                routerLink="/services"
                label="Serviços"
                (click)="mobileMenuOpen = false"
              ></a>
              <a
                pButton
                text
                class="w-full justify-content-start"
                routerLink="/bookings"
                label="Agendamentos"
                (click)="mobileMenuOpen = false"
              ></a>
              <a
                pButton
                text
                class="w-full justify-content-start"
                routerLink="/profile"
                label="Perfil"
                (click)="mobileMenuOpen = false"
              ></a>
            }
            @if (isAuthenticated()) {
              <p-button
                label="Sair"
                severity="secondary"
                styleClass="w-full"
                (onClick)="logout()"
              />
            }
          </div>
        </div>
      }

      <!-- Main content -->
      <main class="flex-1 p-3" style="min-width: 0; overflow-x: hidden">
        <router-outlet />
      </main>
    </div>
  `,
})
export class MainLayoutComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly salonName = SALON_NAME;
  readonly isAdmin = this.auth.isAdmin;
  readonly isAuthenticated = this.auth.isAuthenticated;
  mobileMenuOpen = false;

  logout(): void {
    this.auth.logout();
  }
}
