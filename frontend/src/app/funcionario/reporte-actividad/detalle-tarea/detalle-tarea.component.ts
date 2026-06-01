import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';

import { etiquetaClienteReferencia, Tarea } from '../../../core/models/tarea.model';
import { formatoTiempoAbierto } from '../../../core/utils/tiempo-abierto.util';

@Component({
  selector: 'app-detalle-tarea',
  standalone: true,
  imports: [NgClass, MatCardModule, MatChipsModule],
  templateUrl: './detalle-tarea.component.html',
  styleUrl: './detalle-tarea.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetalleTareaComponent {
  @Input({ required: true }) tarea!: Tarea;

  readonly formatoTiempoAbierto = formatoTiempoAbierto;

  estadoLabel(estado: Tarea['estado']): string {
    switch (estado) {
      case 'pendiente':
        return 'Pendiente';
      case 'en_atencion':
        return 'En atención';
      case 'completado':
        return 'Completada';
      default:
        return estado;
    }
  }

  badgeClass(estado: Tarea['estado']): string {
    return `badge--${estado}`;
  }

  clienteEtiqueta(t: Tarea): string {
    return etiquetaClienteReferencia(t);
  }

  slaPlaceholder(dias?: number): string {
    const base = typeof dias === 'number' ? dias : 0;
    const lim = Math.max(3, base + 3);
    return `${lim} días hábiles`;
  }
}
