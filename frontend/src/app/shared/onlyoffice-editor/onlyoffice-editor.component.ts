import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  Injector,
  input,
  OnDestroy,
  PLATFORM_ID,
  afterNextRender,
} from '@angular/core';

import {
  docColaborativoFileType,
  type DocumentoColaborativo,
} from '../../core/models/doc-colaborativo.model';
import { environment } from '../../../environments/environment';

declare global {
  interface Window {
    DocsAPI?: {
      DocEditor: new (
        id: string,
        config: Record<string, unknown>,
      ) => { destroyEditor: () => void };
    };
  }
}

let scriptLoadPromise: Promise<void> | null = null;

function loadOnlyOfficeApi(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }
  if (window.DocsAPI) {
    return Promise.resolve();
  }
  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }
  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${environment.onlyofficeUrl}/web-apps/apps/api/documents/api.js`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar OnlyOffice Document Server'));
    document.body.appendChild(script);
  });
  return scriptLoadPromise;
}

@Component({
  selector: 'app-onlyoffice-editor',
  standalone: true,
  template: `<div [id]="containerId" class="onlyoffice-editor"></div>`,
  styles: [
    `
      .onlyoffice-editor {
        min-height: 600px;
        width: 100%;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlyofficeEditorComponent implements OnDestroy {
  readonly doc = input.required<DocumentoColaborativo>();
  readonly readonly = input(false);

  private readonly platformId = inject(PLATFORM_ID);
  private readonly injector = inject(Injector);
  readonly containerId = `onlyoffice-${Math.random().toString(36).slice(2, 10)}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private editorInstance: { destroyEditor: () => void } | null = null;
  private lastConfigKey = '';

  constructor() {
    effect(() => {
      const documento = this.doc();
      const soloLectura = this.readonly();
      if (!documento?.documentKey || !isPlatformBrowser(this.platformId)) {
        return;
      }
      const configKey = `${documento.documentKey}:${soloLectura}`;
      if (configKey === this.lastConfigKey) {
        return;
      }
      this.lastConfigKey = configKey;
      afterNextRender(
        () => {
          void this.initEditor(documento, soloLectura);
        },
        { injector: this.injector },
      );
    });
  }

  ngOnDestroy(): void {
    this.destroyEditor();
  }

  private async initEditor(
    documento: DocumentoColaborativo,
    soloLectura: boolean,
  ): Promise<void> {
    try {
      await loadOnlyOfficeApi();
    } catch {
      return;
    }
    this.destroyEditor();

    const tramiteId = documento.tramiteId;
    const nodoId = documento.nodoId;
    const fileType = docColaborativoFileType(documento.plantillaContenido);
    const contentUrl =
      `${environment.backendPublicUrl}/api/doc-colaborativo/${tramiteId}/${nodoId}/content`;
    const callbackUrl =
      `${environment.backendPublicUrl}/api/doc-colaborativo/${tramiteId}/${nodoId}/callback`;

    const config = {
      document: {
        fileType,
        key: documento.documentKey,
        title: documento.titulo,
        url: contentUrl,
      },
      documentType: 'word',
      editorConfig: {
        mode: soloLectura ? 'view' : 'edit',
        lang: 'es',
        callbackUrl,
      },
      height: '600px',
      width: '100%',
    };

    if (window.DocsAPI) {
      this.editorInstance = new window.DocsAPI.DocEditor(this.containerId, config);
    }
  }

  private destroyEditor(): void {
    if (this.editorInstance) {
      try {
        this.editorInstance.destroyEditor();
      } catch {
        /* ignore teardown errors */
      }
      this.editorInstance = null;
    }
  }
}
