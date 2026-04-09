import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  distinctUntilChanged,
  finalize,
  map,
  of,
  shareReplay,
  startWith,
  switchMap,
} from 'rxjs';

import { Politica } from '../../core/models/politica.model';
import { PoliticaService } from '../../core/services/politica.service';
import { TramiteService } from '../../core/services/tramite.service';

@Component({
  selector: 'app-nuevo-proceso',
  standalone: true,
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
  templateUrl: './nuevo-proceso.component.html',
  styleUrl: './nuevo-proceso.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NuevoProcesoComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);
  private readonly politicaService = inject(PoliticaService);
  private readonly tramiteService = inject(TramiteService);

  readonly enviando = signal(false);

  readonly form = this.fb.nonNullable.group({
    nombreCompleto: ['', [Validators.required, Validators.minLength(2)]],
    telefono: ['', [Validators.required, Validators.minLength(6)]],
    email: ['', [Validators.email]],
    politicaId: ['', Validators.required],
  });

  readonly politicasActivas$ = this.politicaService.getPoliticas().pipe(
    map((lista) => lista.filter((p) => p.activa && p.id)),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly politicaSeleccionada$ = this.form.controls.politicaId.valueChanges.pipe(
    startWith(this.form.controls.politicaId.value),
    distinctUntilChanged(),
    switchMap((id) =>
      id ? this.politicaService.getPoliticaById(id) : of(null),
    ),
    map((p) => (p && p.id ? p : null)),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  cancelar(): void {
    void this.router.navigate(['/funcionario/bandeja']);
  }

  iniciarTramite(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { politicaId } = this.form.getRawValue();
    this.enviando.set(true);
    this.politicaService
      .getPoliticaById(politicaId)
      .pipe(
        switchMap((p) => {
          if (!p?.id) {
            throw new Error('Política no encontrada');
          }
          const totalPasos = this.listaActividades(p).length;
          const clienteIdRaw =
            globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}`;
          return this.tramiteService.crearTramite({
            politicaId: p.id,
            politicaNombre: p.nombre,
            clienteId: `cli-${clienteIdRaw}`,
            estado: 'iniciado',
            esParalelo: this.tieneFlujoParalelo(p),
            actividadActual: this.primeraActividadEtiqueta(p),
            pasoActual: 1,
            totalPasos: Math.max(1, totalPasos),
          });
        }),
        finalize(() => this.enviando.set(false)),
      )
      .subscribe({
        next: () => {
          this.snack.open('Trámite iniciado correctamente', 'Cerrar', {
            duration: 4000,
          });
          void this.router.navigate(['/funcionario/bandeja']);
        },
        error: () => {
          this.snack.open(
            'No se pudo iniciar el trámite. Intente de nuevo.',
            'Cerrar',
            { duration: 5000 },
          );
        },
      });
  }

  /** Solo nodos ACTIVIDAD, ordenados por posición horizontal del diagrama. */
  listaActividades(p: Politica): string[] {
    return [...(p.nodos ?? [])]
      .filter((n) => n.tipo === 'ACTIVIDAD')
      .sort((a, b) => a.posicionX - b.posicionX)
      .map((n) => n.etiqueta);
  }

  tiempoEstimado(p: Politica): string {
    const act = this.listaActividades(p).length;
    const dec = (p.nodos ?? []).filter((n) => n.tipo === 'DECISION').length;
    const horas = Math.max(2, act * 4 + dec * 2);
    if (horas < 24) {
      return `~${horas} h hábiles (estimado)`;
    }
    const dias = Math.round(horas / 8);
    return `~${dias} días hábiles (estimado)`;
  }

  private tieneFlujoParalelo(p: Politica): boolean {
    return (p.nodos ?? []).some((n) => n.tipo === 'FORK_BAR');
  }

  private primeraActividadEtiqueta(p: Politica): string {
    const actividades = this.listaActividades(p);
    return actividades[0] ?? 'Inicio';
  }
}
