import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();

  let outReq = req;
  if (token) {
    outReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`),
    });
  } else if (
    req.url.startsWith(environment.apiUrl) &&
    !req.params.has('establishmentId')
  ) {
    // Anonymous request to our API → attach the salon establishmentId so
    // public endpoints (catalog, availability, config) know the tenant.
    outReq = req.clone({
      params: req.params.set('establishmentId', environment.establishmentId),
    });
  }

  return next(outReq).pipe(
    catchError((err) => {
      if (err.status === 401 && auth.isAuthenticated()) {
        auth.logout();
      }
      return throwError(() => err);
    }),
  );
};
