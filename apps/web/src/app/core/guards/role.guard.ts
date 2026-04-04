import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { Role } from '@cabeleleila/contracts';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const requiredRoles = route.data['roles'] as Role[];

  const userRole = auth.currentUser()?.role;
  if (userRole && requiredRoles.includes(userRole)) {
    return true;
  }
  return router.createUrlTree(['/bookings']);
};
