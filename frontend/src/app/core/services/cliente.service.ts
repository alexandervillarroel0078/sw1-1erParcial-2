import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { Cliente } from '../models/cliente.model';
import { handleApiError } from '../utils/api-error.util';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ClienteService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);

  private readonly base = `${environment.apiUrl}/admin/clientes`;

  getClientes(): Observable<Cliente[]> {
    return this.http.get<Cliente[]>(this.base).pipe(
      catchError((err) => handleApiError(this.auth, this.snack, err)),
    );
  }
}
