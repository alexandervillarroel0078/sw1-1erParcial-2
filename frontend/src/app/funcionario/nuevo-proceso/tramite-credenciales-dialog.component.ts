import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';

export type TramiteCredencialesDialogData = {
  nombreCompleto: string;
  telefono: string;
  email: string | null;
};

@Component({
  selector: 'app-tramite-credenciales-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './tramite-credenciales-dialog.component.html',
  styleUrl: './tramite-credenciales-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TramiteCredencialesDialogComponent {
  private readonly ref = inject(
    MatDialogRef<TramiteCredencialesDialogComponent, void>,
  );
  readonly data = inject(MAT_DIALOG_DATA) as TramiteCredencialesDialogData;

  get contrasenaPlano(): string {
    return `cliente_${this.data.telefono}`;
  }

  get emailMostrar(): string {
    const e = this.data.email?.trim();
    return e && e.length > 0 ? e : '(sin email)';
  }

  cerrar(): void {
    this.ref.close();
  }
}
