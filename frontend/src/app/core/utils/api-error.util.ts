import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';

export function handleApiError(
  auth: AuthService,
  snack: MatSnackBar,
  err: unknown,
): Observable<never> {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 401) {
      auth.logout();
    } else if (err.status === 403) {
      snack.open('Sin permisos', 'Cerrar', { duration: 5000 });
    }
  }
  return throwError(() => err);
}
