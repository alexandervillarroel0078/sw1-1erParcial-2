import { DatePipe } from '@angular/common';
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
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { combineLatest, map, startWith } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';

import { Cliente } from '../../core/models/cliente.model';
import { ClienteService } from '../../core/services/cliente.service';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [
    DatePipe,
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
  templateUrl: './clientes.component.html',
  styleUrl: './clientes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientesComponent implements AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly clienteService = inject(ClienteService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly search = this.fb.nonNullable.control('');

  readonly displayedColumns: string[] = [
    'nombreCompleto',
    'telefono',
    'email',
    'creadoEn',
    'estado',
  ];

  dataSource = new MatTableDataSource<Cliente>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor() {
    combineLatest([
      this.clienteService.getClientes(),
      this.search.valueChanges.pipe(startWith('')),
    ])
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        map(([clientes, q]) => {
          const query = (q ?? '').trim().toLowerCase();
          if (!query) {
            return clientes;
          }
          return clientes.filter(
            (c) =>
              (c.nombreCompleto ?? '').toLowerCase().includes(query) ||
              (c.telefono ?? '').toLowerCase().includes(query),
          );
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

  limpiarBusqueda(): void {
    this.search.setValue('');
  }
}
