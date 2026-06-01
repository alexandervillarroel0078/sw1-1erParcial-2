import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import type { DocumentoColaborativo } from '../../../core/models/doc-colaborativo.model';
import { OnlyofficeEditorComponent } from '../../../shared/onlyoffice-editor/onlyoffice-editor.component';

@Component({
  selector: 'app-documento-colaborativo',
  standalone: true,
  imports: [MatButtonModule, MatProgressSpinnerModule, OnlyofficeEditorComponent],
  templateUrl: './documento-colaborativo.component.html',
  styleUrl: './documento-colaborativo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentoColaborativoComponent {
  @Input() docColab: DocumentoColaborativo | null = null;
  @Input() docColabCargando = false;
  @Input() docColabCreando = false;
  @Input() soloLectura = false;
  @Input() tituloDocColaborativo = '';

  @Output() crear = new EventEmitter<void>();
}
