import { Routes } from '@angular/router';
import { Role } from '@cabeleleila/contracts';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

const mainLayoutLoader = () =>
  import('./layout/main-layout/main-layout.component').then(
    (m) => m.MainLayoutComponent,
  );

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
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./features/auth/forgot-password/forgot-password.component').then(
            (m) => m.ForgotPasswordComponent,
          ),
      },
      {
        path: 'reset-password',
        loadComponent: () =>
          import('./features/auth/reset-password/reset-password.component').then(
            (m) => m.ResetPasswordComponent,
          ),
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },

  // Public routes — no auth required (catalog and booking wizard up to confirmation)
  {
    path: '',
    loadComponent: mainLayoutLoader,
    children: [
      {
        path: 'services',
        loadComponent: () =>
          import('./features/services/service-list/service-list.component').then(
            (m) => m.ServiceListComponent,
          ),
      },
      {
        path: 'bookings/new',
        loadComponent: () =>
          import('./features/bookings/booking-new/booking-new.component').then(
            (m) => m.BookingNewComponent,
          ),
      },
    ],
  },

  // Authenticated routes
  {
    path: '',
    loadComponent: mainLayoutLoader,
    canActivate: [authGuard],
    children: [
      {
        path: 'bookings',
        loadComponent: () =>
          import('./features/bookings/booking-history/booking-history.component').then(
            (m) => m.BookingHistoryComponent,
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
            path: 'today',
            loadComponent: () =>
              import('./features/admin/today/today.component').then(
                (m) => m.AdminTodayComponent,
              ),
          },
          {
            path: 'customers',
            loadComponent: () =>
              import('./features/admin/customers/customers.component').then(
                (m) => m.AdminCustomersComponent,
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
          {
            path: 'time-blocks',
            loadComponent: () =>
              import('./features/admin/time-blocks/time-blocks.component').then(
                (m) => m.AdminTimeBlocksComponent,
              ),
          },
          { path: '', redirectTo: 'today', pathMatch: 'full' },
        ],
      },
      { path: '', redirectTo: 'bookings', pathMatch: 'full' },
    ],
  },

  { path: '**', redirectTo: '/bookings/new' },
];
