import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export type ConfirmDialogData = {
  titulo: string;
  mensaje: string;
  confirmarTexto?: string;
  cancelarTexto?: string;
};

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.titulo }}</h2>
    <div mat-dialog-content>{{ data.mensaje }}</div>
    <div mat-dialog-actions align="end">
      <button mat-button type="button" (click)="ref.close(false)">
        {{ data.cancelarTexto ?? 'Cancelar' }}
      </button>
      <button mat-raised-button color="warn" type="button" (click)="ref.close(true)">
        {{ data.confirmarTexto ?? 'Eliminar' }}
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent {
  readonly ref = inject(MatDialogRef<ConfirmDialogComponent, boolean>);
  readonly data = inject(MAT_DIALOG_DATA) as ConfirmDialogData;
}

