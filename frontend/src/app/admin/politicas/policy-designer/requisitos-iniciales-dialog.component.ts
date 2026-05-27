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

import type { RequisitoInicial } from '../../../core/models/politica.model';

export type RequisitosInicialesDialogData = {
  requisitos: RequisitoInicial[];
};

function uuid(): string {
  return globalThis.crypto?.randomUUID?.() ?? `req-${Date.now()}-${Math.random()}`;
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
  ],
  templateUrl: './requisitos-iniciales-dialog.component.html',
  styleUrl: './requisitos-iniciales-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequisitosInicialesDialogComponent {
  readonly ref = inject(MatDialogRef<RequisitosInicialesDialogComponent>);
  private readonly data = inject<RequisitosInicialesDialogData>(MAT_DIALOG_DATA);

  readonly requisitos = signal<RequisitoInicial[]>(
    structuredClone(this.data.requisitos ?? []),
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
      { id: uuid(), nombre: '', descripcion: '' },
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
      }))
      .filter((r) => r.nombre.length > 0);
    this.ref.close(lista);
  }
}
