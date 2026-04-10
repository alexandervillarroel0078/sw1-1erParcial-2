import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { combineLatest, map, startWith, Subject, switchMap, take } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';

import { Departamento } from '../../core/models/departamento.model';
import { DepartamentoService } from '../../core/services/departamento.service';
import { FuncionarioService } from '../../core/services/funcionario.service';
import { DepartamentoDeleteDialogComponent } from './departamento-delete-dialog.component';
import {
  DepartamentoFormComponent,
  DepartamentoFormResult,
} from './departamento-form/departamento-form.component';
import { FuncionariosDeptoDialogComponent } from './funcionarios-depto-dialog/funcionarios-depto-dialog.component';

export type DepartamentoRow = Departamento & { cantidadFuncionarios: number };

@Component({
  selector: 'app-departamentos',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatToolbarModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatChipsModule,
  ],
  templateUrl: './departamentos.component.html',
  styleUrl: './departamentos.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartamentosComponent implements AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly departamentoService = inject(DepartamentoService);
  private readonly funcionarioService = inject(FuncionarioService);
  private readonly dialog = inject(MatDialog);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly search = this.fb.nonNullable.control('');

  readonly displayedColumns: string[] = [
    'nombre',
    'funcionarios',
    'estado',
    'acciones',
  ];

  dataSource = new MatTableDataSource<DepartamentoRow>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  private readonly refresh$ = new Subject<void>();

  constructor() {
    const data$ = this.refresh$.pipe(
      startWith(undefined),
      switchMap(() =>
        combineLatest([
          this.departamentoService.getDepartamentos(),
          this.funcionarioService.getFuncionarios(),
        ]),
      ),
    );

    combineLatest([
      data$,
      this.search.valueChanges.pipe(startWith('')),
    ])
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        map(([[deps, users], q]) => {
          const counts = new Map<string, number>();
          for (const u of users) {
            const id = u.departamentoId ?? '';
            if (!id) continue;
            counts.set(id, (counts.get(id) ?? 0) + 1);
          }
          const query = (q ?? '').trim().toLowerCase();
          return deps
            .filter(
              (d) =>
                !query ||
                (d.nombre ?? '').toLowerCase().includes(query),
            )
            .map((d) => ({
              ...d,
              cantidadFuncionarios: counts.get(d.id ?? '') ?? 0,
            })) as DepartamentoRow[];
        }),
      )
      .subscribe((rows) => {
        this.dataSource.data = rows;
        this.cdr.markForCheck();
      });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  nuevoDepartamento(): void {
    const ref = this.dialog.open(DepartamentoFormComponent, {
      width: '480px',
      maxWidth: '92vw',
      data: { modo: 'crear' },
    });
    ref
      .afterClosed()
      .pipe(take(1))
      .subscribe((r: DepartamentoFormResult | null | undefined) => {
        if (!r) return;
        this.departamentoService
          .crearDepartamento({ nombre: r.nombre, activo: true })
          .pipe(take(1))
          .subscribe(() => this.refresh$.next());
      });
  }

  editar(row: DepartamentoRow): void {
    const { cantidadFuncionarios: _c, ...dep } = row;
    const ref = this.dialog.open(DepartamentoFormComponent, {
      width: '480px',
      maxWidth: '92vw',
      data: { modo: 'editar', departamento: dep },
    });
    ref
      .afterClosed()
      .pipe(take(1))
      .subscribe((r: DepartamentoFormResult | null | undefined) => {
        if (!r || !row.id) return;
        this.departamentoService
          .actualizarDepartamento(row.id, { nombre: r.nombre })
          .pipe(take(1))
          .subscribe(() => this.refresh$.next());
      });
  }

  activarDesactivar(row: DepartamentoRow): void {
    if (!row.id) return;
    this.departamentoService
      .activarDesactivar(row.id)
      .pipe(take(1))
      .subscribe(() => this.refresh$.next());
  }

  eliminar(row: DepartamentoRow): void {
    if (!row.id) return;
    const ref = this.dialog.open(DepartamentoDeleteDialogComponent, {
      width: '440px',
      maxWidth: '92vw',
      data: {
        nombre: row.nombre,
        cantidadFuncionarios: row.cantidadFuncionarios,
      },
    });
    ref
      .afterClosed()
      .pipe(take(1))
      .subscribe((ok) => {
        if (!ok) return;
        this.departamentoService
          .eliminarDepartamento(row.id!)
          .pipe(take(1))
          .subscribe(() => this.refresh$.next());
      });
  }

  limpiarBusqueda(): void {
    this.search.setValue('');
  }

  verFuncionarios(row: DepartamentoRow): void {
    if (!row.id) return;
    this.dialog.open(FuncionariosDeptoDialogComponent, {
      width: '520px',
      maxWidth: '92vw',
      data: {
        departamentoId: row.id,
        departamentoNombre: row.nombre,
      },
    });
  }
}
