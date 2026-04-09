import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import type { ValidacionFlujoResultado } from './policy-designer-validation';

@Component({
  selector: 'app-validation-result-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './validation-result-dialog.component.html',
  styleUrl: './validation-result-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ValidationResultDialogComponent {
  readonly ref = inject(MatDialogRef<ValidationResultDialogComponent>);
  readonly data = inject<ValidacionFlujoResultado>(MAT_DIALOG_DATA);

  cerrar(): void {
    this.ref.close();
  }

  guardarDeTodasFormas(): void {
    this.ref.close('guardar' as const);
  }
}
