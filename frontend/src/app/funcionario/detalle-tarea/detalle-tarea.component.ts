import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-detalle-tarea',
  standalone: true,
  template: `<h1>DetalleTareaComponent</h1>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetalleTareaComponent {}

