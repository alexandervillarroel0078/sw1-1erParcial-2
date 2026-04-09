import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [MatCardModule],
  template: `
    <mat-card class="card" appearance="outlined">
      <h2 class="title">Historial</h2>
      <p class="muted">Próximamente podrás ver el historial de trámites aquí.</p>
    </mat-card>
  `,
  styles: [
    `
      .card {
        padding: 20px;
        border-radius: 16px;
        max-width: 560px;
      }
      .title {
        margin: 0 0 8px;
        font-size: 1.15rem;
      }
      .muted {
        margin: 0;
        opacity: 0.72;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistorialComponent {}
