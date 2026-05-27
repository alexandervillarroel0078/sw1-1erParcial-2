import { HttpErrorResponse } from '@angular/common/http';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { provideNativeDateAdapter } from '@angular/material/core';
import { map, switchMap, take } from 'rxjs';
import type {
  SeccionPlantillaDocumentoColaborativo,
  SeccionPlantillaTipo,
} from '../../../core/models/doc-colaborativo.model';
import type {
  CampoFormulario,
  FormularioActividad,
} from '../../../core/models/nodo.model';
import { DepartamentoService } from '../../../core/services/departamento.service';
import { PoliticaService } from '../../../core/services/politica.service';
import type {
  CampoFormularioItem,
  CampoFormularioTipo,
  TipoCampoPaleta,
} from './formulario-designer.models';

function uuid(): string {
  return globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random()}`;
}

function nombreDefaultPorTipo(t: CampoFormularioTipo): string {
  const mapa: Record<CampoFormularioTipo, string> = {
    texto_corto: 'Texto corto',
    texto_largo: 'Texto largo',
    select: 'Selección',
    imagen: 'Imagen',
    archivo: 'Archivo',
    checkbox: 'Casilla',
    fecha: 'Fecha',
  };
  return mapa[t];
}

function nombreDefaultPorTipoSeccion(t: SeccionPlantillaTipo): string {
  const mapa: Record<SeccionPlantillaTipo, string> = {
    texto_corto: 'Texto corto',
    texto_largo: 'Texto largo',
    select: 'Selección',
    checkbox: 'Casilla',
    fecha: 'Fecha',
    tabla: 'Tabla',
  };
  return mapa[t];
}

const TIPOS_SECCION_VALIDOS = new Set<SeccionPlantillaTipo>([
  'texto_corto',
  'texto_largo',
  'fecha',
  'checkbox',
  'select',
  'tabla',
]);

const TIPO_API_A_SECCION: Record<string, SeccionPlantillaTipo> = {
  TEXTO_CORTO: 'texto_corto',
  TEXTO_LARGO: 'texto_largo',
  SELECT: 'select',
  CHECKBOX: 'checkbox',
  FECHA: 'fecha',
  TABLA: 'tabla',
};

function normalizeSeccionPlantilla(
  s: SeccionPlantillaDocumentoColaborativo,
): SeccionPlantillaDocumentoColaborativo {
  const raw = String(s.tipo ?? 'texto_largo');
  const normalizado =
    TIPO_API_A_SECCION[raw] ??
    (raw.toLowerCase() as SeccionPlantillaTipo);
  const tipo: SeccionPlantillaTipo = TIPOS_SECCION_VALIDOS.has(normalizado)
    ? normalizado
    : 'texto_largo';
  return {
    id: s.id?.trim() ? s.id : `sec-${uuid()}`,
    titulo: s.titulo?.trim() ? s.titulo : nombreDefaultPorTipoSeccion(tipo),
    tipo,
    obligatorio: !!s.obligatorio,
    opciones:
      tipo === 'select' && Array.isArray(s.opciones)
        ? s.opciones.map((x) => String(x))
        : tipo === 'select'
          ? ['Opción 1', 'Opción 2', 'Opción 3']
          : undefined,
  };
}

/** Nombres de enum `TipoCampo` del API Java en JSON. */
const TIPO_API_A_ITEM: Record<string, CampoFormularioTipo> = {
  TEXTO_CORTO: 'texto_corto',
  TEXTO_LARGO: 'texto_largo',
  SELECT: 'select',
  IMAGEN: 'imagen',
  ARCHIVO: 'archivo',
  CHECKBOX: 'checkbox',
  FECHA: 'fecha',
};

const TIPO_ITEM_A_API: Record<CampoFormularioTipo, string> = {
  texto_corto: 'TEXTO_CORTO',
  texto_largo: 'TEXTO_LARGO',
  select: 'SELECT',
  imagen: 'IMAGEN',
  archivo: 'ARCHIVO',
  checkbox: 'CHECKBOX',
  fecha: 'FECHA',
};

function campoApiToItem(c: CampoFormulario): CampoFormularioItem {
  const raw = String(c.tipo);
  const tipo = TIPO_API_A_ITEM[raw] ?? 'texto_corto';
  const opciones = c.opciones;
  const opcionesSelect =
    tipo === 'select' && Array.isArray(opciones)
      ? opciones.map((x) => String(x))
      : undefined;
  return {
    id: c.id?.trim() ? c.id : `cf-${uuid()}`,
    nombre: c.etiqueta ?? '',
    tipo,
    obligatorio: !!c.obligatorio,
    orden: c.orden,
    opcionesSelect,
  };
}

function itemToCampoFormulario(item: CampoFormularioItem): CampoFormulario {
  return {
    id: item.id,
    formularioId: '',
    orden: item.orden,
    tipo: TIPO_ITEM_A_API[item.tipo] as CampoFormulario['tipo'],
    etiqueta: item.nombre,
    obligatorio: item.obligatorio,
    opciones: item.tipo === 'select' ? [...(item.opcionesSelect ?? [])] : [],
  } as CampoFormulario;
}

/** Cuando el GET del formulario responde 404 (aún no guardado en BD). */
function camposInicialesPor404(): CampoFormularioItem[] {
  return [
    {
      id: `cf-${uuid()}`,
      nombre: 'Descripción del trabajo',
      tipo: 'texto_largo',
      obligatorio: true,
      orden: 0,
    },
    {
      id: `cf-${uuid()}`,
      nombre: 'Observaciones',
      tipo: 'texto_largo',
      obligatorio: false,
      orden: 1,
    },
  ];
}

@Component({
  selector: 'app-formulario-designer',
  standalone: true,
  providers: [provideNativeDateAdapter()],
  imports: [
    FormsModule,
    DragDropModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatSlideToggleModule,
    MatTabsModule,
  ],
  templateUrl: './formulario-designer.component.html',
  styleUrl: './formulario-designer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioDesignerComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly politicaService = inject(PoliticaService);
  private readonly departamentoService = inject(DepartamentoService);
  private readonly snack = inject(MatSnackBar);

  readonly tiposPaleta: TipoCampoPaleta[] = [
    { tipo: 'texto_corto', label: 'Texto corto', icon: 'short_text' },
    { tipo: 'texto_largo', label: 'Texto largo', icon: 'subject' },
    { tipo: 'select', label: 'Selección (select)', icon: 'list' },
    { tipo: 'imagen', label: 'Imagen', icon: 'image' },
    { tipo: 'archivo', label: 'Archivo', icon: 'attach_file' },
    { tipo: 'checkbox', label: 'Checkbox', icon: 'check_box' },
    { tipo: 'fecha', label: 'Fecha', icon: 'event' },
  ];

  readonly tiposPaletaDocColab: { tipo: SeccionPlantillaTipo; label: string; icon: string }[] =
    [
      { tipo: 'texto_corto', label: 'Texto corto', icon: 'short_text' },
      { tipo: 'texto_largo', label: 'Texto largo', icon: 'subject' },
      { tipo: 'select', label: 'Selección (select)', icon: 'list' },
      { tipo: 'checkbox', label: 'Checkbox', icon: 'check_box' },
      { tipo: 'fecha', label: 'Fecha', icon: 'event' },
    ];

  readonly politicaId = signal<string | null>(null);
  readonly nodoId = signal<string | null>(null);
  readonly actividadEtiqueta = signal('Actividad');
  readonly departamentoNombre = signal('—');
  readonly campos = signal<CampoFormularioItem[]>([]);
  readonly documentoColaborativoHabilitado = signal(false);
  readonly tituloDocColab = signal('');
  readonly seccionesDocColab = signal<SeccionPlantillaDocumentoColaborativo[]>([]);
  /** Demo compartida para la vista previa de campos tipo fecha */
  readonly demoFecha = signal<Date | null>(null);

  readonly camposOrdenados = computed(() =>
    [...this.campos()].sort((a, b) => a.orden - b.orden),
  );

  readonly seccionesDocColabOrdenadas = computed(() => [...this.seccionesDocColab()]);

  constructor() {
    this.route.paramMap
      .pipe(
        switchMap((pm) => {
          const politicaId = pm.get('politicaId') ?? '';
          const nodoId = pm.get('nodoId') ?? '';
          return this.politicaService.getPoliticaById(politicaId).pipe(
            switchMap((politica) =>
              this.politicaService
                .getFormularioActividad(politicaId, nodoId)
                .pipe(map((form) => ({ politicaId, nodoId, politica, form }))),
            ),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe(({ politicaId, nodoId, politica, form }) => {
        this.politicaId.set(politicaId || null);
        this.nodoId.set(nodoId || null);
        const nodo = politica?.nodos?.find((n) => n.id === nodoId);
        if (!nodo || nodo.tipo !== 'ACTIVIDAD') {
          this.snack.open(
            'Actividad no encontrada o inválida',
            'Cerrar',
            { duration: 3500 },
          );
          void this.router.navigate(['/admin/politicas', politicaId, 'editor']);
          return;
        }
        this.actividadEtiqueta.set(nodo.etiqueta);
        this.departamentoService.getDepartamentos().pipe(take(1)).subscribe((deps) => {
          const dep = deps.find((d) => d.id === nodo.departamentoId);
          this.departamentoNombre.set(dep?.nombre ?? 'Sin departamento');
        });
        const items =
          form == null
            ? camposInicialesPor404()
            : form.campos?.length && form.campos.length > 0
              ? [...form.campos]
                  .sort((a, b) => a.orden - b.orden)
                  .map((c) => campoApiToItem(c))
              : [];
        this.campos.set(items);
        this.documentoColaborativoHabilitado.set(
          !!form?.habilitadoDocumentoColaborativo,
        );
        this.tituloDocColab.set(form?.tituloDocumentoColaborativo ?? '');
        this.seccionesDocColab.set(
          form?.seccionesDocumentoColaborativo?.length
            ? form.seccionesDocumentoColaborativo.map((s) =>
                normalizeSeccionPlantilla(s),
              )
            : [],
        );
      });
  }

  etiquetaTipo(t: CampoFormularioTipo): string {
    return this.tiposPaleta.find((x) => x.tipo === t)?.label ?? t;
  }

  claseBadgeTipo(t: CampoFormularioTipo): string {
    return `fd-badge fd-badge--${t}`;
  }

  etiquetaTipoSeccion(t: SeccionPlantillaTipo): string {
    if (t === 'tabla') {
      return 'Tabla';
    }
    return this.tiposPaletaDocColab.find((x) => x.tipo === t)?.label ?? t;
  }

  claseBadgeTipoSeccion(t: SeccionPlantillaTipo): string {
    return `fd-badge fd-badge--${t}`;
  }

  agregarCampo(tipo: CampoFormularioTipo): void {
    const list = [...this.campos()];
    const orden = list.length;
    const item: CampoFormularioItem = {
      id: `cf-${uuid()}`,
      nombre: nombreDefaultPorTipo(tipo),
      tipo,
      obligatorio: false,
      orden,
      opcionesSelect:
        tipo === 'select' ? ['Opción 1', 'Opción 2', 'Opción 3'] : undefined,
    };
    this.campos.set([...list, item]);
  }

  onDrop(event: CdkDragDrop<CampoFormularioItem[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    this.campos.update((list) => {
      const sorted = [...list].sort((a, b) => a.orden - b.orden);
      moveItemInArray(sorted, event.previousIndex, event.currentIndex);
      return sorted.map((c, i) => ({ ...c, orden: i }));
    });
  }

  patchCampoNombre(id: string, nombre: string): void {
    this.campos.update((list) =>
      list.map((c) => (c.id === id ? { ...c, nombre } : c)),
    );
  }

  patchCampoObligatorio(id: string, v: boolean): void {
    this.campos.update((list) =>
      list.map((c) => (c.id === id ? { ...c, obligatorio: v } : c)),
    );
  }

  patchCampoOpciones(id: string, opciones: string[]): void {
    this.campos.update((list) =>
      list.map((c) =>
        c.id === id && c.tipo === 'select'
          ? { ...c, opcionesSelect: [...opciones] }
          : c,
      ),
    );
  }

  agregarOpcionSelect(id: string): void {
    const c = this.campos().find((x) => x.id === id);
    if (!c || c.tipo !== 'select') return;
    this.patchCampoOpciones(id, [...(c.opcionesSelect ?? []), '']);
  }

  eliminarOpcionSelect(id: string, index: number): void {
    const c = this.campos().find((x) => x.id === id);
    if (!c || c.tipo !== 'select') return;
    this.patchCampoOpciones(
      id,
      (c.opcionesSelect ?? []).filter((_, j) => j !== index),
    );
  }

  onOpcionSelectModelChange(id: string, index: number, valor: string): void {
    const c = this.campos().find((x) => x.id === id);
    if (!c || c.tipo !== 'select') return;
    const next = [...(c.opcionesSelect ?? [])];
    next[index] = valor;
    this.patchCampoOpciones(id, next);
  }

  subirCampo(id: string): void {
    this.campos.update((list) => {
      const sorted = [...list].sort((a, b) => a.orden - b.orden);
      const i = sorted.findIndex((c) => c.id === id);
      if (i <= 0) return list;
      [sorted[i - 1], sorted[i]] = [sorted[i], sorted[i - 1]];
      return sorted.map((c, idx) => ({ ...c, orden: idx }));
    });
  }

  bajarCampo(id: string): void {
    this.campos.update((list) => {
      const sorted = [...list].sort((a, b) => a.orden - b.orden);
      const i = sorted.findIndex((c) => c.id === id);
      if (i < 0 || i >= sorted.length - 1) return list;
      [sorted[i], sorted[i + 1]] = [sorted[i + 1], sorted[i]];
      return sorted.map((c, idx) => ({ ...c, orden: idx }));
    });
  }

  eliminarCampo(id: string): void {
    this.campos.update((list) => {
      const next = list.filter((c) => c.id !== id);
      return next.map((c, idx) => ({ ...c, orden: idx }));
    });
  }

  agregarSeccion(tipo: SeccionPlantillaTipo): void {
    this.seccionesDocColab.update((list) => [
      ...list,
      {
        id: `sec-${uuid()}`,
        titulo: nombreDefaultPorTipoSeccion(tipo),
        tipo,
        obligatorio: false,
        opciones:
          tipo === 'select' ? ['Opción 1', 'Opción 2', 'Opción 3'] : undefined,
      },
    ]);
  }

  eliminarSeccion(id: string): void {
    this.seccionesDocColab.update((list) => list.filter((s) => s.id !== id));
  }

  patchSeccionObligatorio(id: string, v: boolean): void {
    this.seccionesDocColab.update((list) =>
      list.map((s) => (s.id === id ? { ...s, obligatorio: v } : s)),
    );
  }

  patchSeccionOpciones(id: string, opciones: string[]): void {
    this.seccionesDocColab.update((list) =>
      list.map((s) =>
        s.id === id && s.tipo === 'select' ? { ...s, opciones: [...opciones] } : s,
      ),
    );
  }

  agregarOpcionSelectSeccion(id: string): void {
    const s = this.seccionesDocColab().find((x) => x.id === id);
    if (!s || s.tipo !== 'select') return;
    this.patchSeccionOpciones(id, [...(s.opciones ?? []), '']);
  }

  eliminarOpcionSelectSeccion(id: string, index: number): void {
    const s = this.seccionesDocColab().find((x) => x.id === id);
    if (!s || s.tipo !== 'select') return;
    this.patchSeccionOpciones(
      id,
      (s.opciones ?? []).filter((_, j) => j !== index),
    );
  }

  onOpcionSelectSeccionModelChange(id: string, index: number, valor: string): void {
    const s = this.seccionesDocColab().find((x) => x.id === id);
    if (!s || s.tipo !== 'select') return;
    const next = [...(s.opciones ?? [])];
    next[index] = valor;
    this.patchSeccionOpciones(id, next);
  }

  subirSeccion(id: string): void {
    this.seccionesDocColab.update((list) => {
      const i = list.findIndex((s) => s.id === id);
      if (i <= 0) return list;
      const next = [...list];
      [next[i - 1], next[i]] = [next[i], next[i - 1]];
      return next;
    });
  }

  bajarSeccion(id: string): void {
    this.seccionesDocColab.update((list) => {
      const i = list.findIndex((s) => s.id === id);
      if (i < 0 || i >= list.length - 1) return list;
      const next = [...list];
      [next[i], next[i + 1]] = [next[i + 1], next[i]];
      return next;
    });
  }

  moverSeccion(from: number, to: number): void {
    if (from === to) return;
    this.seccionesDocColab.update((list) => {
      const next = [...list];
      moveItemInArray(next, from, to);
      return next;
    });
  }

  onDropSeccionDocColab(
    event: CdkDragDrop<SeccionPlantillaDocumentoColaborativo[]>,
  ): void {
    this.moverSeccion(event.previousIndex, event.currentIndex);
  }

  patchSeccionTitulo(id: string, titulo: string): void {
    this.seccionesDocColab.update((list) =>
      list.map((s) => (s.id === id ? { ...s, titulo } : s)),
    );
  }

  volverAlEditor(): void {
    const pid = this.politicaId();
    if (pid) {
      void this.router.navigate(['/admin/politicas', pid, 'editor']);
    } else {
      void this.router.navigate(['/admin/politicas']);
    }
  }

  guardarFormulario(): void {
    const pid = this.politicaId();
    const nid = this.nodoId();
    if (!pid || !nid) {
      return;
    }
    const body: FormularioActividad = {
      politicaId: pid,
      nodoActividadId: nid,
      campos: this.camposOrdenados().map((c) => itemToCampoFormulario(c)),
      tituloDocumentoColaborativo: this.tituloDocColab().trim(),
      seccionesDocumentoColaborativo: this.seccionesDocColabOrdenadas(),
      habilitadoDocumentoColaborativo: this.documentoColaborativoHabilitado(),
    };
    this.politicaService
      .putFormularioActividad(pid, nid, body)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.snack.open('Formulario guardado', 'Cerrar', { duration: 3000 });
        },
        error: (err: unknown) => {
          let msg = 'No se pudo guardar el formulario';
          if (err instanceof HttpErrorResponse) {
            const body = err.error;
            if (
              body &&
              typeof body === 'object' &&
              'message' in body &&
              typeof (body as { message: unknown }).message === 'string'
            ) {
              msg = (body as { message: string }).message;
            } else if (err.message) {
              msg = err.message;
            }
          }
          this.snack.open(msg, 'Cerrar', { duration: 5000 });
        },
      });
  }
}
