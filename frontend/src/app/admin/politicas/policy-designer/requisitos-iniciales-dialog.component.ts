import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';

import type {
  RequisitoInicial,
  TipoArchivoRequisito,
} from '../../../core/models/politica.model';

export type RequisitosInicialesDialogData = {
  requisitos: RequisitoInicial[];
};

export const TIPO_ARCHIVO_OPCIONES: {
  value: TipoArchivoRequisito;
  label: string;
}[] = [
  { value: 'imagen', label: 'Imagen (JPG/PNG)' },
  { value: 'pdf', label: 'Documento PDF' },
  { value: 'documento', label: 'Word/Excel/PDF (cualquier documento)' },
  { value: 'cualquiera', label: 'Cualquier archivo' },
];

function uuid(): string {
  return globalThis.crypto?.randomUUID?.() ?? `req-${Date.now()}-${Math.random()}`;
}

function normalizarTipoArchivo(v: string | undefined | null): TipoArchivoRequisito {
  const s = (v ?? 'cualquiera').trim().toLowerCase();
  if (s === 'imagen' || s === 'pdf' || s === 'documento') {
    return s;
  }
  return 'cualquiera';
}

@Component({
  selector: 'app-requisitos-iniciales-dialog',
  standalone: true,
  imports: [
    FormsModule,
    DragDropModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
  ],
  templateUrl: './requisitos-iniciales-dialog.component.html',
  styleUrl: './requisitos-iniciales-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequisitosInicialesDialogComponent {
  readonly ref = inject(MatDialogRef<RequisitosInicialesDialogComponent>);
  private readonly data = inject<RequisitosInicialesDialogData>(MAT_DIALOG_DATA);

  readonly tipoArchivoOpciones = TIPO_ARCHIVO_OPCIONES;

  readonly requisitos = signal<RequisitoInicial[]>(
    (this.data.requisitos ?? []).map((r) => ({
      ...structuredClone(r),
      tipoArchivo: normalizarTipoArchivo(r.tipoArchivo),
    })),
  );

  onDrop(event: CdkDragDrop<RequisitoInicial[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    this.requisitos.update((list) => {
      const copy = [...list];
      moveItemInArray(copy, event.previousIndex, event.currentIndex);
      return copy;
    });
  }

  agregarRequisito(): void {
    this.requisitos.update((list) => [
      ...list,
      { id: uuid(), nombre: '', descripcion: '', tipoArchivo: 'cualquiera' },
    ]);
  }

  patchNombre(id: string, nombre: string): void {
    this.requisitos.update((list) =>
      list.map((r) => (r.id === id ? { ...r, nombre } : r)),
    );
  }

  patchDescripcion(id: string, descripcion: string): void {
    this.requisitos.update((list) =>
      list.map((r) =>
        r.id === id ? { ...r, descripcion: descripcion || undefined } : r,
      ),
    );
  }

  patchTipoArchivo(id: string, tipoArchivo: TipoArchivoRequisito): void {
    this.requisitos.update((list) =>
      list.map((r) => (r.id === id ? { ...r, tipoArchivo } : r)),
    );
  }

  eliminar(id: string): void {
    this.requisitos.update((list) => list.filter((r) => r.id !== id));
  }

  cerrar(): void {
    this.ref.close();
  }

  guardar(): void {
    const lista = this.requisitos()
      .map((r) => ({
        id: r.id,
        nombre: r.nombre.trim(),
        descripcion: r.descripcion?.trim() || undefined,
        tipoArchivo: normalizarTipoArchivo(r.tipoArchivo),
      }))
      .filter((r) => r.nombre.length > 0);
    console.log('[RequisitosIniciales] guardar — requisitos a persistir en nodo START:', lista);
    this.ref.close(lista);
  }
}
