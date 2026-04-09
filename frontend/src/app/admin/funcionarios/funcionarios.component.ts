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
import { Usuario } from '../../core/models/usuario.model';
import { DepartamentoService } from '../../core/services/departamento.service';
import { FuncionarioService } from '../../core/services/funcionario.service';
import { FuncionarioDeleteDialogComponent } from './funcionario-delete-dialog.component';
import {
  FuncionarioFormComponent,
  FuncionarioFormResult,
} from './funcionario-form/funcionario-form.component';

export type FuncionarioRow = Usuario & { departamentoNombre: string };

@Component({
  selector: 'app-funcionarios',
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
  templateUrl: './funcionarios.component.html',
  styleUrl: './funcionarios.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FuncionariosComponent implements AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly funcionarioService = inject(FuncionarioService);
  private readonly departamentoService = inject(DepartamentoService);
  private readonly dialog = inject(MatDialog);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly search = this.fb.nonNullable.control('');

  readonly displayedColumns: string[] = [
    'avatar',
    'nombre',
    'correo',
    'departamento',
    'rol',
    'estado',
    'acciones',
  ];

  dataSource = new MatTableDataSource<FuncionarioRow>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  private readonly refresh$ = new Subject<void>();
  private departamentosCache: Departamento[] = [];

  constructor() {
    const data$ = this.refresh$.pipe(
      startWith(undefined),
      switchMap(() =>
        combineLatest([
          this.funcionarioService.getFuncionarios(),
          this.departamentoService.getDepartamentos(),
        ]),
      ),
    );

    combineLatest([
      data$,
      this.search.valueChanges.pipe(startWith('')),
    ])
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        map(([[users, deps], q]) => {
          this.departamentosCache = deps;
          const depMap = new Map(
            deps.map((d) => [d.id ?? '', d.nombre] as const),
          );
          const query = (q ?? '').trim().toLowerCase();
          return users
            .filter(
              (u) =>
                !query ||
                `${u.nombre} ${u.correo}`.toLowerCase().includes(query),
            )
            .map((u) => ({
              ...u,
              departamentoNombre:
                depMap.get(u.departamentoId ?? '') ?? '—',
            })) as FuncionarioRow[];
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

  iniciales(nombre: string): string {
    const p = nombre.trim().split(/\s+/).filter(Boolean);
    if (!p.length) return '?';
    const a = p[0][0] ?? '';
    const b = p.length > 1 ? (p[1][0] ?? '') : (p[0][1] ?? '');
    return (a + b).toUpperCase();
  }

  rolEtiqueta(rol: Usuario['rol']): string {
    return rol === 'ADMINISTRADOR' ? 'Administrador' : 'Funcionario';
  }

  nuevoFuncionario(): void {
    const ref = this.dialog.open(FuncionarioFormComponent, {
      width: '520px',
      maxWidth: '92vw',
      data: {
        modo: 'crear',
        departamentos: this.departamentosCache,
      },
    });
    ref
      .afterClosed()
      .pipe(take(1))
      .subscribe((r: FuncionarioFormResult | null | undefined) => {
        if (!r) return;
        this.funcionarioService
          .crearFuncionario({
            nombre: r.nombre,
            correo: r.correo,
            rol: r.rol,
            departamentoId: r.departamentoId,
            activo: true,
            creadoEn: new Date(),
          })
          .pipe(take(1))
          .subscribe(() => this.refresh$.next());
      });
  }

  editar(row: FuncionarioRow): void {
    const { departamentoNombre: _d, ...usuario } = row;
    const ref = this.dialog.open(FuncionarioFormComponent, {
      width: '520px',
      maxWidth: '92vw',
      data: {
        modo: 'editar',
        usuario,
        departamentos: this.departamentosCache,
      },
    });
    ref
      .afterClosed()
      .pipe(take(1))
      .subscribe((r: FuncionarioFormResult | null | undefined) => {
        if (!r || !row.id) return;
        this.funcionarioService
          .actualizarFuncionario(row.id, {
            ...usuario,
            nombre: r.nombre,
            correo: r.correo,
            rol: r.rol,
            departamentoId: r.departamentoId,
          })
          .pipe(take(1))
          .subscribe(() => this.refresh$.next());
      });
  }

  eliminar(row: FuncionarioRow): void {
    if (!row.id) return;
    const ref = this.dialog.open(FuncionarioDeleteDialogComponent, {
      width: '440px',
      maxWidth: '92vw',
      data: { nombre: row.nombre },
    });
    ref
      .afterClosed()
      .pipe(take(1))
      .subscribe((ok) => {
        if (!ok) return;
        this.funcionarioService
          .eliminarFuncionario(row.id!)
          .pipe(take(1))
          .subscribe(() => this.refresh$.next());
      });
  }

  limpiarBusqueda(): void {
    this.search.setValue('');
  }
}
