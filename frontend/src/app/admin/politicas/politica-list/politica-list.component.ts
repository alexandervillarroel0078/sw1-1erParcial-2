import { AsyncPipe, DatePipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import {
  BehaviorSubject,
  combineLatest,
  EMPTY,
  map,
  startWith,
  switchMap,
  take,
} from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';

import { Politica } from '../../../core/models/politica.model';
import { PoliticaService } from '../../../core/services/politica.service';
import {
  PoliticaFormComponent,
  PoliticaFormResult,
} from '../politica-form/politica-form.component';
import { ConfirmDialogComponent } from './confirm-dialog.component';

type PoliticaCardVM = Politica & {
  nodosCount: number;
  depsCount: number;
};

@Component({
  selector: 'app-politica-list',
  standalone: true,
  imports: [
    AsyncPipe,
    NgClass,
    DatePipe,
    ReactiveFormsModule,
    MatToolbarModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatCardModule,
    MatDialogModule,
  ],
  templateUrl: './politica-list.component.html',
  styleUrl: './politica-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PoliticaListComponent {
  private readonly politicaService = inject(PoliticaService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly fb = inject(FormBuilder);

  readonly search = this.fb.nonNullable.control('');

  private readonly recargarPoliticas$ = new BehaviorSubject<void>(undefined);

  private readonly politicas$ = this.recargarPoliticas$.pipe(
    switchMap(() => this.politicaService.getPoliticas()),
  );

  readonly vm$ = combineLatest([
    this.politicas$,
    this.search.valueChanges.pipe(startWith('')),
  ]).pipe(
    map(([politicas, q]) => {
      const query = (q ?? '').trim().toLowerCase();
      const cards = politicas
        .map((p) => this.toCardVM(p))
        .filter((p) =>
          query
            ? `${p.nombre} ${p.subtitulo ?? ''}`.toLowerCase().includes(query)
            : true,
        )
        .sort((a, b) => (b.fechaCreacion ? +new Date(b.fechaCreacion) : 0) - (a.fechaCreacion ? +new Date(a.fechaCreacion) : 0));
      return { cards, total: cards.length };
    }),
  );

  cargarPoliticas(): void {
    this.recargarPoliticas$.next(undefined);
  }

  nuevaPolitica(): void {
    const ref = this.dialog.open(PoliticaFormComponent, {
      width: '640px',
      maxWidth: '92vw',
      data: { modo: 'crear' },
    });

    ref
      .afterClosed()
      .pipe(take(1))
      .subscribe((result: PoliticaFormResult | null | undefined) => {
        if (!result) return;
        this.politicaService.crearPolitica({
          nombre: result.nombre,
          subtitulo: result.subtitulo,
          colorTema: result.colorTema,
          activa: true,
          nodos: [],
          aristas: [],
          fechaCreacion: new Date(),
        })
          .pipe(take(1))
          .subscribe(() => this.cargarPoliticas());
      });
  }

  editar(p: Politica): void {
    const ref = this.dialog.open(PoliticaFormComponent, {
      width: '640px',
      maxWidth: '92vw',
      data: { modo: 'editar', politica: p },
    });

    ref
      .afterClosed()
      .pipe(take(1))
      .subscribe((result: PoliticaFormResult | null | undefined) => {
        if (!result || !p.id) return;
        this.politicaService
          .actualizarPolitica(p.id, {
            ...p,
            nombre: result.nombre,
            subtitulo: result.subtitulo,
            colorTema: result.colorTema,
          })
          .pipe(take(1))
          .subscribe(() => this.cargarPoliticas());
      });
  }

  irEditor(p: Politica): void {
    if (!p.id) return;
    void this.router.navigate(['/admin/politicas', p.id, 'editor']);
  }

  activarDesactivar(p: Politica): void {
    if (!p.id) return;
    this.politicaService
      .activarDesactivar(p.id)
      .pipe(take(1))
      .subscribe(() => this.cargarPoliticas());
  }

  eliminar(p: Politica): void {
    if (!p.id) return;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '520px',
      maxWidth: '92vw',
      data: {
        titulo: 'Eliminar política',
        mensaje: `¿Seguro que querés eliminar “${p.nombre}”? Esta acción no se puede deshacer.`,
        confirmarTexto: 'Eliminar',
        cancelarTexto: 'Cancelar',
      },
    });

    ref
      .afterClosed()
      .pipe(
        take(1),
        switchMap((ok) => (ok ? this.politicaService.eliminarPolitica(p.id!) : EMPTY)),
      )
      .subscribe(() => this.cargarPoliticas());
  }

  estadoLabel(activa: boolean): string {
    return activa ? 'Activa' : 'Inactiva';
  }

  private toCardVM(p: Politica): PoliticaCardVM {
    const nodosCount = p.nodos?.length ?? 0;
    const deps = new Set((p.nodos ?? []).map((n) => n.departamentoId).filter(Boolean));
    return { ...p, nodosCount, depsCount: deps.size };
  }
}

