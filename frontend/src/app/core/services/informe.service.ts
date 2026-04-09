import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { Informe } from '../models/informe.model';

function uuid(): string {
  // reemplazar con IDs del backend cuando esté listo
  return globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random()}`;
}

@Injectable({ providedIn: 'root' })
export class InformeService {
  private informes: Informe[] = [];

  crearInforme(informe: Informe): Observable<Informe> {
    // reemplazar con HTTP cuando el backend esté listo
    const ahora = new Date();
    const nuevo: Informe = {
      ...informe,
      id: informe.id ?? uuid(),
      creadoEn: informe.creadoEn ?? ahora,
      enviadoEn: informe.esBorrador ? informe.enviadoEn : (informe.enviadoEn ?? ahora),
    };
    this.informes = [nuevo, ...this.informes];
    return of(structuredClone(nuevo));
  }
}
