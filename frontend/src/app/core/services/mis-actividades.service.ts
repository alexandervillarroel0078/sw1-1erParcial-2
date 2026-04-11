import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { MisActividadesResponse } from '../models/mis-actividades.model';
import { AuthService } from './auth.service';
import { handleApiError } from '../utils/api-error.util';

@Injectable({ providedIn: 'root' })
export class MisActividadesService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);

  private readonly url = `${environment.apiUrl}/funcionario/mis-actividades`;

  getMisActividades(): Observable<MisActividadesResponse> {
    return this.http.get<MisActividadesResponse>(this.url).pipe(
      catchError((err) => handleApiError(this.auth, this.snack, err)),
    );
  }
}
