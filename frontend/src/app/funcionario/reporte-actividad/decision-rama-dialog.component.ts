import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';

import { OpcionDecision } from '../../core/models/tarea.model';

export type DecisionRamaDialogData = {
  condicion: string;
  opciones: OpcionDecision[];
};

@Component({
  selector: 'app-decision-rama-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatTooltipModule],
  templateUrl: './decision-rama-dialog.component.html',
  styleUrl: './decision-rama-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DecisionRamaDialogComponent {
  private readonly ref = inject(
    MatDialogRef<DecisionRamaDialogComponent, string | undefined>,
  );
  readonly data = inject(MAT_DIALOG_DATA) as DecisionRamaDialogData;

  elegir(etiqueta: string): void {
    this.ref.close(etiqueta);
  }
}
