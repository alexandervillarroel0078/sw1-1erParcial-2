import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';

export type DepartamentoDeleteDialogData = {
  nombre: string;
  cantidadFuncionarios: number;
};

@Component({
  selector: 'app-departamento-delete-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    @if (data.cantidadFuncionarios > 0) {
      <h2 mat-dialog-title>No se puede eliminar</h2>
      <div mat-dialog-content class="msg">
        No podés eliminar un departamento con funcionarios asignados.
      </div>
      <div mat-dialog-actions align="end">
        <button mat-raised-button color="primary" type="button" (click)="ref.close(false)">
          Aceptar
        </button>
      </div>
    } @else {
      <h2 mat-dialog-title>Eliminar departamento</h2>
      <div mat-dialog-content class="msg">
        ¿Estás seguro de eliminar el departamento «{{ data.nombre }}»?
      </div>
      <div mat-dialog-actions align="end">
        <button mat-button type="button" (click)="ref.close(false)">Cancelar</button>
        <button mat-raised-button color="warn" type="button" (click)="ref.close(true)">
          Eliminar
        </button>
      </div>
    }
  `,
  styles: [
    `
      .msg {
        padding-top: 6px;
        max-width: 420px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartamentoDeleteDialogComponent {
  readonly ref = inject(
    MatDialogRef<DepartamentoDeleteDialogComponent, boolean>,
  );
  readonly data = inject(MAT_DIALOG_DATA) as DepartamentoDeleteDialogData;
}
