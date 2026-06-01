import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import { Informe } from '../../../core/models/informe.model';
import type { CampoFormulario } from '../../../core/models/nodo.model';
import { Tarea } from '../../../core/models/tarea.model';
import { DocumentosComponent } from '../../../shared/documentos/documentos.component';

type ModoEntrada = 'texto' | 'voz';

type TipoCampoReporte =
  | 'texto_corto'
  | 'texto_largo'
  | 'select'
  | 'imagen'
  | 'archivo'
  | 'checkbox'
  | 'fecha';

@Component({
  selector: 'app-mi-informe',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,
    DocumentosComponent,
  ],
  templateUrl: './mi-informe.component.html',
  styleUrl: './mi-informe.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MiInformeComponent {
  @Input() tarea: Tarea | null = null;
  @Input() informe: Informe | null = null;
  @Input({ required: true }) form!: FormGroup;
  @Input() modo: ModoEntrada = 'texto';
  @Input() grabando = false;
  @Input() lineaVoz = '';
  @Input() speechDisponible = false;
  @Input() enviando = false;
  @Input() soloLectura = false;
  @Input() camposFormularioOrdenados: CampoFormulario[] = [];
  @Input() usarFormularioDinamico = false;
  @Input() vistaCamposDinamicos = false;
  @Input() permisoNodoActual = 'ACCESO_COMPLETO';

  @Output() completar = new EventEmitter<void>();
  @Output() guardarBorrador = new EventEmitter<void>();
  @Output() setModo = new EventEmitter<ModoEntrada>();
  @Output() toggleMic = new EventEmitter<void>();
  @Output() limpiarVoz = new EventEmitter<void>();

  campoControlKey(c: CampoFormulario): string {
    const id = (c.id ?? `o${c.orden}`).toString().replace(/[^a-zA-Z0-9_-]/g, '_');
    return `f_${id}`;
  }

  normalizeTipoCampo(tipo: unknown): TipoCampoReporte {
    const s = String(tipo ?? '').trim();
    const u = s.toUpperCase().replace(/-/g, '_');
    const map: Record<string, TipoCampoReporte> = {
      TEXTO_CORTO: 'texto_corto',
      TEXTO_LARGO: 'texto_largo',
      SELECT: 'select',
      IMAGEN: 'imagen',
      ARCHIVO: 'archivo',
      CHECKBOX: 'checkbox',
      FECHA: 'fecha',
      texto_corto: 'texto_corto',
      texto_largo: 'texto_largo',
      select: 'select',
      imagen: 'imagen',
      archivo: 'archivo',
      checkbox: 'checkbox',
      fecha: 'fecha',
    };
    return map[u] ?? map[s] ?? 'texto_corto';
  }

  opcionesCampoSelect(c: CampoFormulario): string[] {
    const raw = c.opciones ?? [];
    return raw.map((o) => (typeof o === 'string' ? o : String(o)));
  }
}
