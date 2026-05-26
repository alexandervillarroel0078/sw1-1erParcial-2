import { DatePipe, NgClass } from '@angular/common';
import { Component, inject, Input, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DocumentoDTO, DocumentoService } from '../../core/services/documento.service';

@Component({
  selector: 'app-documentos',
  standalone: true,
  imports: [
    DatePipe,
    NgClass,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
  ],
  template: `
    <div style="margin-top: 24px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
        <h3 style="margin: 0; font-size: 15px; font-weight: 600; color: #374151;">
          <mat-icon style="vertical-align: middle; margin-right: 6px; font-size: 18px;">folder_open</mat-icon>
          Documentos del trámite
        </h3>
        <button mat-stroked-button color="primary" (click)="fileInput.click()" [disabled]="subiendo()">
          @if (subiendo()) {
            <mat-spinner diameter="16" style="display:inline-block; margin-right:6px;"></mat-spinner>
            Subiendo...
          } @else {
            <mat-icon>upload</mat-icon>
            Subir documento
          }
        </button>
        <input #fileInput type="file" hidden (change)="onFileSelected($event)" accept="*/*">
      </div>

      @if (cargando()) {
        <div style="text-align: center; padding: 20px;">
          <mat-spinner diameter="30"></mat-spinner>
        </div>
      } @else if (documentos().length === 0) {
        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 13px; border: 1px dashed #e5e7eb; border-radius: 8px;">
          <mat-icon style="font-size: 32px; display: block; margin: 0 auto 8px;">description</mat-icon>
          No hay documentos subidos aún
        </div>
      } @else {
        <div style="display: flex; flex-direction: column; gap: 8px;">
          @for (doc of documentos(); track doc.id) {
            <div style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;">
              <mat-icon style="color: #6b7280; flex-shrink: 0;">
                {{ iconoPorTipo(doc.tipo) }}
              </mat-icon>
              <div style="flex: 1; min-width: 0;">
                <div style="font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  {{ doc.nombre }}
                </div>
                <div style="font-size: 11px; color: #9ca3af;">
                  {{ doc.subidoPorNombre }} · {{ doc.subidoEn | date:'dd/MM/yyyy HH:mm' }} · {{ formatearTamano(doc.tamanoBytes) }}
                </div>
              </div>
              <button mat-icon-button matTooltip="Ver / Descargar" (click)="verDocumento(doc)">
                <mat-icon>open_in_new</mat-icon>
              </button>
              <button mat-icon-button matTooltip="Eliminar" color="warn" (click)="eliminarDocumento(doc)">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class DocumentosComponent implements OnInit {
  @Input() tramiteId!: string;
  @Input() nodoId!: string;

  private readonly documentoService = inject(DocumentoService);
  private readonly snack = inject(MatSnackBar);

  readonly documentos = signal<DocumentoDTO[]>([]);
  readonly cargando = signal(false);
  readonly subiendo = signal(false);

  ngOnInit(): void {
    this.cargarDocumentos();
  }

  cargarDocumentos(): void {
    if (!this.tramiteId) return;
    this.cargando.set(true);
    this.documentoService.listarPorTramite(this.tramiteId).subscribe({
      next: (docs) => {
        this.documentos.set(docs);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.subiendo.set(true);
    this.documentoService.subirDocumento(file, this.tramiteId, this.nodoId).subscribe({
      next: (doc) => {
        this.documentos.update(docs => [doc, ...docs]);
        this.subiendo.set(false);
        this.snack.open('Documento subido correctamente', 'OK', { duration: 3000 });
        input.value = '';
      },
      error: () => {
        this.subiendo.set(false);
        this.snack.open('Error al subir documento', 'Cerrar', { duration: 4000 });
      },
    });
  }

  verDocumento(doc: DocumentoDTO): void {
    this.documentoService.obtenerUrl(doc.id).subscribe({
      next: (res) => window.open(res.url, '_blank', 'noopener'),
      error: () => this.snack.open('No se pudo obtener la URL', 'Cerrar', { duration: 3000 }),
    });
  }

  eliminarDocumento(doc: DocumentoDTO): void {
    if (!confirm(`¿Eliminar "${doc.nombre}"?`)) return;
    this.documentoService.eliminar(doc.id).subscribe({
      next: () => {
        this.documentos.update(docs => docs.filter(d => d.id !== doc.id));
        this.snack.open('Documento eliminado', 'OK', { duration: 3000 });
      },
      error: () => this.snack.open('Error al eliminar', 'Cerrar', { duration: 3000 }),
    });
  }

  iconoPorTipo(tipo: string): string {
    if (!tipo) return 'description';
    if (tipo.includes('image')) return 'image';
    if (tipo.includes('pdf')) return 'picture_as_pdf';
    if (tipo.includes('word') || tipo.includes('document')) return 'article';
    if (tipo.includes('sheet') || tipo.includes('excel')) return 'table_chart';
    return 'description';
  }

  formatearTamano(bytes: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
