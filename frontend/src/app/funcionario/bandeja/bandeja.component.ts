import { AsyncPipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import {
  combineLatest,
  map,
  merge,
  of,
  startWith,
  Subject,
  switchMap,
  take,
} from 'rxjs';

import type { PoliticaMisActividades } from '../../core/models/mis-actividades.model';
import { etiquetaClienteReferencia, Tarea } from '../../core/models/tarea.model';
import { MisActividadesService } from '../../core/services/mis-actividades.service';
import { TareaService } from '../../core/services/tarea.service';

export type FiltroBandeja = 'todas' | Tarea['estado'];

@Component({
  selector: 'app-bandeja',
  standalone: true,
  imports: [
    AsyncPipe,
    NgClass,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatChipsModule,
    MatExpansionModule,
    MatIconModule,
  ],
  templateUrl: './bandeja.component.html',
  styleUrl: './bandeja.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BandejaComponent {
  private readonly fb = inject(FormBuilder);
  private readonly tareaService = inject(TareaService);
  private readonly misActividadesService = inject(MisActividadesService);
  private readonly router = inject(Router);

  private readonly refresh$ = new Subject<void>();

  readonly filtro = this.fb.nonNullable.control<FiltroBandeja>('todas');

  private readonly tareas$ = merge(of(undefined), this.refresh$).pipe(
    switchMap(() => this.tareaService.getMisTareas()),
  );

  private readonly misActividades$ = merge(of(undefined), this.refresh$).pipe(
    switchMap(() => this.misActividadesService.getMisActividades()),
  );

  readonly vm$ = combineLatest([
    this.tareas$,
    this.misActividades$,
    this.filtro.valueChanges.pipe(startWith(this.filtro.value)),
  ]).pipe(
    map(([tareas, actividadesRes, f]) => {
      const pendientes = tareas.filter((t) => t.estado === 'pendiente').length;
      const enAtencion = tareas.filter((t) => t.estado === 'en_atencion').length;
      const completadas = tareas.filter((t) => t.estado === 'completado').length;
      const lista =
        f === 'todas'
          ? tareas
          : tareas.filter((t) => t.estado === f);
      lista.sort((a, b) => {
        const orden = { pendiente: 0, en_atencion: 1, completado: 2 };
        const oa = orden[a.estado];
        const ob = orden[b.estado];
        if (oa !== ob) return oa - ob;
        return (b.diasAbierto ?? 0) - (a.diasAbierto ?? 0);
      });
      const misActividades: PoliticaMisActividades[] = actividadesRes.politicas ?? [];
      const departamentoNombre =
        actividadesRes.departamentoNombre?.trim() || '—';

      return {
        pendientes,
        enAtencion,
        completadas,
        departamentoNombre,
        misActividades,
        lista: lista.map((t) => ({
          ...t,
          estadoLabel: this.estadoLabel(t.estado),
          stripeClass: `stripe--${t.estado}`,
          badgeClass: `badge--${t.estado}`,
        })),
      };
    }),
  );

  clienteEtiqueta(t: Tarea): string {
    return etiquetaClienteReferencia(t);
  }

  estadoLabel(estado: Tarea['estado']): string {
    switch (estado) {
      case 'pendiente':
        return 'Pendiente';
      case 'en_atencion':
        return 'En atención';
      case 'completado':
        return 'Completada';
      default:
        return estado;
    }
  }

  atender(id: string | undefined): void {
    if (!id) return;
    this.tareaService
      .atenderTarea(id)
      .pipe(take(1))
      .subscribe(() => this.refresh$.next());
  }

  reportar(id: string | undefined): void {
    if (!id) return;
    void this.router.navigate(['/funcionario/reporte', id]);
  }

  verReporte(id: string | undefined): void {
    this.reportar(id);
  }
}
