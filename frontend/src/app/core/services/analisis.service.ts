import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { AnalisisPoliticaMetricas } from '../models/analisis-metricas.model';
import { handleApiError } from '../utils/api-error.util';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AnalisisService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);

  private readonly base = `${environment.apiUrl}/admin/analisis`;

  getMetricasPolitica(politicaId: string): Observable<AnalisisPoliticaMetricas> {
    return this.http
      .get<AnalisisPoliticaMetricas>(
        `${this.base}/politicas/${encodeURIComponent(politicaId)}`,
      )
      .pipe(catchError((err) => handleApiError(this.auth, this.snack, err)));
  }
}
