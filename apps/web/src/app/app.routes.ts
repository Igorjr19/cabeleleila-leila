import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { Role } from '@cabeleleila/contracts';

export const routes: Routes = [
  {
    path: 'auth',
    loadComponent: () =>
      import('./layout/auth-layout/auth-layout.component').then(
        (m) => m.AuthLayoutComponent,
      ),
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login/login.component').then(
            (m) => m.LoginComponent,
          ),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/register/register.component').then(
            (m) => m.RegisterComponent,
          ),
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/main-layout/main-layout.component').then(
        (m) => m.MainLayoutComponent,
      ),
    canActivate: [authGuard],
    children: [
      {
        path: 'services',
        loadComponent: () =>
          import('./features/services/service-list/service-list.component').then(
            (m) => m.ServiceListComponent,
          ),
      },
      {
        path: 'bookings',
        loadComponent: () =>
          import('./features/bookings/booking-history/booking-history.component').then(
            (m) => m.BookingHistoryComponent,
          ),
      },
      {
        path: 'bookings/new',
        loadComponent: () =>
          import('./features/bookings/booking-new/booking-new.component').then(
            (m) => m.BookingNewComponent,
          ),
      },
      {
        path: 'bookings/:id',
        loadComponent: () =>
          import('./features/bookings/booking-detail/booking-detail.component').then(
            (m) => m.BookingDetailComponent,
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then(
            (m) => m.ProfileComponent,
          ),
      },
      {
        path: 'admin',
        canActivate: [roleGuard],
        data: { roles: [Role.ADMIN] },
        children: [
          {
            path: 'dashboard',
            loadComponent: () =>
              import('./features/admin/dashboard/dashboard.component').then(
                (m) => m.DashboardComponent,
              ),
          },
          {
            path: 'bookings',
            loadComponent: () =>
              import('./features/admin/admin-bookings/admin-bookings.component').then(
                (m) => m.AdminBookingsComponent,
              ),
          },
          {
            path: 'services',
            loadComponent: () =>
              import('./features/admin/admin-services/admin-services.component').then(
                (m) => m.AdminServicesComponent,
              ),
          },
          {
            path: 'establishment',
            loadComponent: () =>
              import('./features/admin/establishment-config/establishment-config.component').then(
                (m) => m.EstablishmentConfigComponent,
              ),
          },
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
        ],
      },
      { path: '', redirectTo: 'bookings', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '/bookings' },
];
