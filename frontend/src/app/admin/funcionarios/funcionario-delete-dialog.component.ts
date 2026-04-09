import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';

export type FuncionarioDeleteDialogData = {
  nombre: string;
};

@Component({
  selector: 'app-funcionario-delete-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Eliminar funcionario</h2>
    <div mat-dialog-content class="msg">
      ¿Estás seguro de eliminar a {{ data.nombre }}?
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button type="button" (click)="ref.close(false)">Cancelar</button>
      <button mat-raised-button color="warn" type="button" (click)="ref.close(true)">
        Eliminar
      </button>
    </div>
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
export class FuncionarioDeleteDialogComponent {
  readonly ref = inject(
    MatDialogRef<FuncionarioDeleteDialogComponent, boolean>,
  );
  readonly data = inject(MAT_DIALOG_DATA) as FuncionarioDeleteDialogData;
}
