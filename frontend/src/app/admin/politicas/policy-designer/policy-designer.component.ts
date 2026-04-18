import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DragDropModule, CdkDragEnd } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize, map, switchMap, take } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import type {
  Arista,
  AristaHaciaPuerto,
  Nodo,
  OrientacionCalles,
  Politica,
} from '../../../core/models/politica.model';
import {
  normalizeNodoTipo,
  normalizeOrientacionCalles,
} from '../../../core/models/politica.model';
import type { Departamento } from '../../../core/models/departamento.model';
import { DepartamentoService } from '../../../core/services/departamento.service';
import { PoliticaService } from '../../../core/services/politica.service';
import { IaService } from '../../../core/services/ia.service';
import type {
  AristaCanvas,
  CalleCanvas,
  NodoCanvas,
  NodoCanvasTipo,
} from './policy-designer.models';
import {
  SWIM_HEADER_V,
  SWIM_HORIZ_CONTENT_W,
  SWIM_LABEL_H,
  SWIM_ORIGIN_X,
  SWIM_ORIGIN_Y,
  SWIM_VERT_TOTAL_H,
  LANE_MIN_H_RESIZE,
  LANE_MIN_W_RESIZE,
  altoCalleHorizontal,
  anchoCalleVertical,
  callesOrdenadas as ordenarCalles,
  hitTestCalleHorizontal,
  hitTestCalleVertical,
} from './policy-designer-swimlanes';
import {
  nodeHalfSize,
  pathBezierEntreNodos,
  puertoEntradaLocalDecision,
  puertoLocal,
  puertoVerticesLocalParallel,
  puntoMedioBezierArista,
  snapshotFrom,
} from './policy-designer.utils';
import {
  crearNodoVacio,
  posicionDerechaOrigen,
  posicionJoinDesdeActividades,
  posicionParalelas,
  posicionFinDesde,
} from './policy-designer-layout';
import {
  buildValidation as buildValidationFlujo,
  etiquetaAutomaticaSegundaSalidaDecision,
  type ValidacionFlujoResultado,
} from './policy-designer-validation';
import { ValidationResultDialogComponent } from './validation-result-dialog.component';

const ZOOM_MIN = 0.3;
const ZOOM_MAX = 2;
const HIST_MAX = 50;

const MSG_DECISION_MAX_SALIENTES =
  'Este nodo ya tiene las dos ramas configuradas (Sí y No)';

const MINIMAP_W = 150;
const MINIMAP_H = 100;

type SwimVl = {
  ox: number;
  oy: number;
  rightX: number;
  bodyH: number;
};
type SwimHl = {
  ox: number;
  oy: number;
  bottomY: number;
  contentW: number;
};

function computeWorldBounds(
  nodos: NodoCanvas[],
  vl: SwimVl | null,
  hl: SwimHl | null,
): { minX: number; minY: number; maxX: number; maxY: number } {
  const pad = 80;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodos) {
    const { hw, hh } = nodeHalfSize(n.tipo);
    minX = Math.min(minX, n.x - hw);
    maxX = Math.max(maxX, n.x + hw);
    minY = Math.min(minY, n.y - hh);
    maxY = Math.max(maxY, n.y + hh);
  }
  if (vl) {
    minX = Math.min(minX, vl.ox);
    maxX = Math.max(maxX, vl.rightX);
    minY = Math.min(minY, vl.oy);
    maxY = Math.max(maxY, vl.oy + SWIM_VERT_TOTAL_H);
  }
  if (hl) {
    minX = Math.min(minX, hl.ox);
    maxX = Math.max(maxX, hl.ox + hl.contentW);
    minY = Math.min(minY, hl.oy);
    maxY = Math.max(maxY, hl.bottomY);
  }
  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 960, maxY: 640 };
  }
  return {
    minX: minX - pad,
    minY: minY - pad,
    maxX: maxX + pad,
    maxY: maxY + pad,
  };
}

function minimapColorTipo(t: NodoCanvasTipo): string {
  switch (t) {
    case 'START':
      return '#2e7d32';
    case 'END':
      return '#c62828';
    case 'ACTIVIDAD':
      return '#1565c0';
    case 'DECISION':
      return '#6a1b9a';
    case 'FORK_BAR':
    case 'JOIN_BAR':
      return '#455a64';
    default:
      return '#78909c';
  }
}

/** Colores fijos por nombre de departamento (clave normalizada). */
const COLOR_DEPTO_POR_NOMBRE: Record<string, string> = {
  'atencion al cliente': '#1565C0',
  'validacion tecnica': '#2E7D32',
  juridico: '#6A1B9A',
  direccion: '#E65100',
  'soporte tecnico': '#00838F',
};

const PALETA_DEPTO_ROTATIVA = [
  '#1565C0',
  '#2E7D32',
  '#6A1B9A',
  '#E65100',
  '#00838F',
  '#5e35b1',
  '#00695c',
];

const COLOR_ACTIVIDAD_SIN_DEPTO = '#1976D2';

function uuid(): string {
  return globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random()}`;
}

function mapNodoToCanvas(n: Nodo): NodoCanvas {
  return {
    id: n.id,
    tipo: normalizeNodoTipo(n.tipo),
    etiqueta: n.etiqueta,
    x: n.posicionX,
    y: n.posicionY,
    departamento: n.departamentoId,
    departamentoTexto: n.departamentoTexto,
    calleId: n.calleId,
    slaMinutos: n.slaMinutos,
  };
}

function mapCanvasToNodo(n: NodoCanvas): Nodo {
  return {
    id: n.id,
    tipo: normalizeNodoTipo(n.tipo),
    etiqueta: n.etiqueta,
    posicionX: Math.round(n.x),
    posicionY: Math.round(n.y),
    departamentoId: n.departamento,
    departamentoTexto: n.departamentoTexto,
    calleId: n.calleId,
    slaMinutos: n.slaMinutos,
  };
}

function mapCanvasToArista(a: AristaCanvas): Arista {
  return {
    id: a.id,
    desdeNodoId: a.desdeNodoId,
    haciaNodoId: a.haciaNodoId,
    etiqueta: a.etiqueta,
    haciaPuerto: a.haciaPuerto,
    desdePuerto: a.desdePuerto,
  };
}

type WizardFlujo = 'directo' | 'paralelo' | 'existente' | 'fin';
type WizardNoModo = 'actividad' | 'fin' | 'bucle';

type RamaDecisionPanelItem = {
  aristaId: string;
  kind: 'si' | 'no' | 'sin' | 'otro';
  chipText: string;
};

type RecVoz = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((ev: { results: SpeechRecognitionResultList }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

@Component({
  selector: 'app-policy-designer',
  standalone: true,
  imports: [
    FormsModule,
    DragDropModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatIconModule,
    MatTooltipModule,
    MatDividerModule,
    MatTabsModule,
    MatRadioModule,
    MatCheckboxModule,
    MatChipsModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './policy-designer.component.html',
  styleUrl: './policy-designer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PolicyDesignerComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly politicaService = inject(PoliticaService);
  private readonly departamentoService = inject(DepartamentoService);
  private readonly iaService = inject(IaService);
  private readonly snack = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  readonly viewportRef = viewChild<ElementRef<SVGGElement>>('viewportG');
  readonly canvasScrollRef = viewChild<ElementRef<HTMLDivElement>>('canvasScroll');

  /** Rectángulo de vista actual en coords del minimap (0–150 × 0–100). */
  readonly minimapViewport = signal<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  readonly nombrePolitica = signal('Nueva política');
  readonly nodos = signal<NodoCanvas[]>([]);
  readonly aristas = signal<AristaCanvas[]>([]);
  readonly calles = signal<CalleCanvas[]>([]);
  readonly orientacionCalles = signal<OrientacionCalles>('VERTICAL');
  readonly flashCalleId = signal<string | null>(null);
  readonly resaltarCalleId = signal<string | null>(null);
  readonly departamentosLista = signal<Departamento[]>([]);
  /** id departamento → color de relleno en nodos ACTIVIDAD */
  readonly departamentoColores = signal<Map<string, string>>(new Map());
  private resaltarTimer: number | null = null;

  readonly puertosEntradaDecision: readonly AristaHaciaPuerto[] = [
    'N',
    'S',
    'E',
    'O',
  ];

  readonly puertosSalidaFork: readonly AristaHaciaPuerto[] = ['E', 'N', 'S'];

  readonly puertosEntradaJoin: readonly AristaHaciaPuerto[] = ['O', 'N', 'S'];

  private swimResizeDrag: {
    calleId: string;
    axis: 'x' | 'y';
    initialClient: number;
    initialSize: number;
  } | null = null;

  readonly swimOriginX = SWIM_ORIGIN_X;
  readonly swimOriginY = SWIM_ORIGIN_Y;
  readonly swimHeaderV = SWIM_HEADER_V;
  readonly swimLabelH = SWIM_LABEL_H;
  readonly swimVertTotalH = SWIM_VERT_TOTAL_H;
  readonly swimHorizContentW = SWIM_HORIZ_CONTENT_W;

  readonly callesOrdenadasVm = computed(() => ordenarCalles(this.calles()));

  readonly swimVerticalLayout = computed(() => {
    const lanes = this.callesOrdenadasVm();
    if (this.orientacionCalles() !== 'VERTICAL' || lanes.length === 0) return null;
    const ox = SWIM_ORIGIN_X;
    const oy = SWIM_ORIGIN_Y;
    const items: { calle: CalleCanvas; x0: number; w: number }[] = [];
    let x = ox;
    for (let i = 0; i < lanes.length; i++) {
      const c = lanes[i];
      const w = anchoCalleVertical(c, i);
      items.push({ calle: c, x0: x, w });
      x += w;
    }
    return {
      ox,
      oy,
      items,
      totalW: x - ox,
      rightX: x,
      bodyH: SWIM_VERT_TOTAL_H - SWIM_HEADER_V,
    };
  });

  readonly swimHorizontalLayout = computed(() => {
    const lanes = this.callesOrdenadasVm();
    if (this.orientacionCalles() !== 'HORIZONTAL' || lanes.length === 0) return null;
    const ox = SWIM_ORIGIN_X;
    const oy = SWIM_ORIGIN_Y;
    const items: { calle: CalleCanvas; y0: number; h: number }[] = [];
    let y = oy;
    for (let i = 0; i < lanes.length; i++) {
      const c = lanes[i];
      const h = altoCalleHorizontal(c, i);
      items.push({ calle: c, y0: y, h });
      y += h;
    }
    const contentW = SWIM_LABEL_H + SWIM_HORIZ_CONTENT_W;
    return { ox, oy, items, totalH: y - oy, bottomY: y, contentW };
  });

  readonly zoom = signal(1);
  readonly panX = signal(0);
  readonly panY = signal(0);
  readonly seleccionId = signal<string | null>(null);
  /** Arista seleccionada (excluyente con nodo). */
  readonly aristaSeleccionId = signal<string | null>(null);
  /** Origen de conexión: nodo + puerto 'out' (FORK: punta E/N/S). */
  readonly conexionDesde = signal<{
    nodoId: string;
    puerto: 'out';
    forkOutLado?: AristaHaciaPuerto;
  } | null>(null);

  private politicaId: string | null = null;
  private politicaBase: Politica | null = null;

  /** Id de política en ruta (para navegar al diseñador de formulario por actividad). */
  readonly politicaRutaId = signal<string | null>(null);

  private historialPasado: ReturnType<typeof snapshotFrom>[] = [];
  private historialFuturo: ReturnType<typeof snapshotFrom>[] = [];

  private panArrastre: {
    sx: number;
    sy: number;
    ox: number;
    oy: number;
  } | null = null;

  private panPrevia: { x: number; y: number } | null = null;


  readonly nodoSeleccionado = computed(() => {
    const id = this.seleccionId();
    if (!id) return null;
    return this.nodos().find((n) => n.id === id) ?? null;
  });

  /**
   * Valor del input «SLA (minutos)» en el panel. Depende de `nodos()` para que,
   * con OnPush, el campo se actualice al seleccionar o hidratar un nodo ACTIVIDAD.
   */
  readonly slaMinutosPanel = computed(() => {
    const n = this.nodoSeleccionado();
    if (!n || n.tipo !== 'ACTIVIDAD') return null;
    const v = n.slaMinutos;
    if (v == null || !Number.isFinite(v)) return null;
    return Math.round(v);
  });

  /**
   * Aristas salientes del nodo DECISION seleccionado, con texto y estilo de chip
   * para el panel Propiedades.
   */
  readonly ramasSalientesDecisionSeleccion = computed((): RamaDecisionPanelItem[] => {
    const n = this.nodoSeleccionado();
    if (!n || n.tipo !== 'DECISION') {
      return [];
    }
    const porId = new Map(this.nodos().map((x) => [x.id, x]));
    const salientes = this.aristas().filter((a) => a.desdeNodoId === n.id);
    return salientes.map((ar) => {
      const dest = porId.get(ar.haciaNodoId);
      const nombreDest =
        dest != null
          ? (dest.etiqueta?.trim() ? dest.etiqueta.trim() : this.tipoLabel(dest.tipo))
          : '(nodo desconocido)';
      const raw = (ar.etiqueta ?? '').trim();
      const t = raw
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '');
      let kind: 'si' | 'no' | 'sin' | 'otro';
      let chipText: string;
      if (t === 'si' || t === 'yes') {
        kind = 'si';
        chipText = `Sí → ${nombreDest}`;
      } else if (t === 'no') {
        kind = 'no';
        chipText = `No → ${nombreDest}`;
      } else if (!raw) {
        kind = 'sin';
        chipText = `Sin etiqueta → ${nombreDest}`;
      } else {
        kind = 'otro';
        chipText = `${raw} → ${nombreDest}`;
      }
      return { aristaId: ar.id, kind, chipText };
    });
  });

  readonly aristaSeleccionada = computed(() => {
    const id = this.aristaSeleccionId();
    if (!id) return null;
    return this.aristas().find((a) => a.id === id) ?? null;
  });

  readonly tieneStart = computed(() =>
    this.nodos().some((n) => n.tipo === 'START'),
  );

  readonly transformViewport = computed(
    () =>
      `translate(${this.panX()}, ${this.panY()}) scale(${this.zoom()})`,
  );

  readonly diagramaStats = computed(
    () => `${this.nodos().length} nodos · ${this.aristas().length} conexiones`,
  );

  readonly etiquetaZoomPorcentaje = computed(
    () => `${Math.round(this.zoom() * 100)}%`,
  );

  readonly minimapDots = computed(() => {
    const nodos = this.nodos();
    const vl = this.swimVerticalLayout();
    const hl = this.swimHorizontalLayout();
    const b = computeWorldBounds(nodos, vl, hl);
    const bw = Math.max(1e-6, b.maxX - b.minX);
    const bh = Math.max(1e-6, b.maxY - b.minY);
    const cols = this.departamentoColores();
    return nodos.map((n) => {
      let fill = minimapColorTipo(n.tipo);
      if (n.tipo === 'ACTIVIDAD') {
        const id = n.departamento?.trim();
        fill = id
          ? (cols.get(id) ?? COLOR_ACTIVIDAD_SIN_DEPTO)
          : COLOR_ACTIVIDAD_SIN_DEPTO;
      }
      return {
        id: n.id,
        mx: ((n.x - b.minX) / bw) * MINIMAP_W,
        my: ((n.y - b.minY) / bh) * MINIMAP_H,
        fill,
      };
    });
  });

  readonly puedeDeshacer = signal(false);
  readonly puedeRehacer = signal(false);

  /** Pestañas internas del asistente: 0 = Flujo asistido, 1 = IA */
  readonly asistenteTabIndex = signal(0);

  readonly wizardPaso = signal<1 | 2 | 3>(1);
  readonly wizardAddTipo = signal<'ACTIVIDAD' | 'DECISION' | null>(null);
  readonly wizardFlujo = signal<WizardFlujo | null>(null);
  readonly wizardCondicion = signal('');
  readonly wizardNombreActividad = signal('');
  readonly wizardDeptoActividad = signal('');
  readonly wizardParaleloCount = signal(2);
  readonly wizardParaleloItems = signal<{ nombre: string; depto: string }[]>([
    { nombre: 'Rama 1', depto: '' },
    { nombre: 'Rama 2', depto: '' },
  ]);
  readonly wizardExistenteId = signal('');
  readonly wizardSiEsFin = signal(false);
  readonly wizardSiNombre = signal('');
  readonly wizardSiDepto = signal('');
  readonly wizardNoModo = signal<WizardNoModo>('actividad');
  readonly wizardNoNombre = signal('');
  readonly wizardNoDepto = signal('');

  readonly iaInstruccion = signal('');
  readonly iaEnviando = signal(false);
  private iaReconocimiento: { stop: () => void } | null = null;
  readonly iaEscuchandoVoz = signal(false);

  readonly actividadesParaEnlace = computed(() => {
    const origenId = this.seleccionId();
    return this.nodos().filter(
      (n) => n.tipo === 'ACTIVIDAD' && n.id !== origenId,
    );
  });

  /** Departamentos que tienen al menos una ACTIVIDAD en el canvas (leyenda). */
  readonly leyendaCanvasDepartamentos = computed(() => {
    const nodos = this.nodos();
    const colores = this.departamentoColores();
    const items: { id: string; nombre: string; color: string }[] = [];
    const seen = new Set<string>();

    const sinDepto = nodos.some(
      (n) => n.tipo === 'ACTIVIDAD' && !n.departamento?.trim(),
    );
    if (sinDepto) {
      items.push({
        id: '__sin__',
        nombre: 'Sin departamento',
        color: COLOR_ACTIVIDAD_SIN_DEPTO,
      });
    }

    for (const n of nodos) {
      if (n.tipo !== 'ACTIVIDAD' || !n.departamento?.trim()) continue;
      const id = n.departamento;
      if (seen.has(id)) continue;
      seen.add(id);
      const nombre =
        n.departamentoTexto ??
        this.departamentosLista().find((d) => d.id === id)?.nombre ??
        id;
      items.push({
        id,
        nombre,
        color: colores.get(id) ?? COLOR_ACTIVIDAD_SIN_DEPTO,
      });
    }
    return items.sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  readonly tiposPaleta: { tipo: NodoCanvasTipo; label: string }[] = [
    { tipo: 'START', label: 'START' },
    { tipo: 'END', label: 'END' },
    { tipo: 'ACTIVIDAD', label: 'Actividad' },
    { tipo: 'DECISION', label: 'Decisión' },
    { tipo: 'FORK_BAR', label: 'Paralelo' },
    { tipo: 'JOIN_BAR', label: 'Unir' },
  ];

  constructor() {
    this.route.paramMap
      .pipe(
        switchMap((pm) => {
          const id = pm.get('id') ?? '';
          return this.politicaService
            .getPoliticaById(id)
            .pipe(map((p) => ({ idRuta: id, politica: p })));
        }),
        takeUntilDestroyed(),
      )
      .subscribe(({ idRuta, politica }) =>
        this.hidratarPolitica(idRuta, politica),
      );

    effect(() => {
      this.seleccionId();
      this.aristaSeleccionId();
      untracked(() => this.reiniciarWizardFormulario());
    });

    effect(() => {
      this.nodos();
      this.aristas();
      this.calles();
      this.orientacionCalles();
      this.zoom();
      this.panX();
      this.panY();
      untracked(() =>
        queueMicrotask(() => {
          this.refreshMinimapViewport();
        }),
      );
    });

    this.destroyRef.onDestroy(() => {
      this.detenerIaReconocimiento();
      if (this.resaltarTimer) {
        clearTimeout(this.resaltarTimer);
        this.resaltarTimer = null;
      }
    });
  }

  ngOnInit(): void {
    this.cargarDepartamentos();
  }

  private cargarDepartamentos(): void {
    this.departamentoService
      .getDepartamentos()
      .pipe(take(1))
      .subscribe((d) => {
        this.departamentosLista.set(d);
        this.rellenarMapaColoresDepartamentos(d);
      });
  }

  private static normNombreDeptoKey(nombre: string): string {
    return nombre
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '');
  }

  private rellenarMapaColoresDepartamentos(depts: Departamento[]): void {
    const map = new Map<string, string>();
    let rot = 0;
    for (const d of depts) {
      if (!d.id || !d.activo) continue;
      const key = PolicyDesignerComponent.normNombreDeptoKey(d.nombre);
      const fijo = COLOR_DEPTO_POR_NOMBRE[key];
      if (fijo) {
        map.set(d.id, fijo);
      } else {
        map.set(
          d.id,
          PALETA_DEPTO_ROTATIVA[rot % PALETA_DEPTO_ROTATIVA.length],
        );
        rot++;
      }
    }
    this.departamentoColores.set(map);
  }

  /** Relleno del rectángulo ACTIVIDAD según departamento. */
  colorFillActividad(n: NodoCanvas): string {
    const id = n.departamento?.trim();
    if (!id) {
      return COLOR_ACTIVIDAD_SIN_DEPTO;
    }
    return this.departamentoColores().get(id) ?? COLOR_ACTIVIDAD_SIN_DEPTO;
  }

  private nombreDepartamento(depId: string | undefined): string | undefined {
    if (!depId) return undefined;
    return this.departamentosLista().find((x) => x.id === depId)?.nombre;
  }

  puertoLocal = puertoLocal;
  puertoEntradaLocalDecision = puertoEntradaLocalDecision;
  puertoVerticesLocalParallel = puertoVerticesLocalParallel;

  pathArista(ar: AristaCanvas): string {
    const map = new Map(this.nodos().map((n) => [n.id, n]));
    const a = map.get(ar.desdeNodoId);
    const b = map.get(ar.haciaNodoId);
    if (!a || !b) return '';
    return pathBezierEntreNodos(a, b, ar.haciaPuerto, ar.desdePuerto);
  }

  markerEndArista(ar: AristaCanvas): string {
    if (!this.esAristaDesdeDecision(ar)) {
      return 'url(#arrowhead)';
    }
    const t = (ar.etiqueta ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '');
    if (t === 'si' || t === 'yes') {
      return 'url(#arrowhead-si)';
    }
    if (t === 'no') {
      return 'url(#arrowhead-no)';
    }
    return 'url(#arrowhead)';
  }

  nodoPorId(id: string): NodoCanvas | undefined {
    return this.nodos().find((n) => n.id === id);
  }

  esAristaDesdeDecision(ar: AristaCanvas): boolean {
    const o = this.nodoPorId(ar.desdeNodoId);
    return o?.tipo === 'DECISION';
  }

  etiquetaDecisionBadge(ar: AristaCanvas): {
    x: number;
    y: number;
    texto: string;
    clase: 'si' | 'no' | 'otro';
  } | null {
    if (!this.esAristaDesdeDecision(ar)) {
      return null;
    }
    const raw = (ar.etiqueta ?? '').trim();
    if (!raw) {
      return null;
    }
    const a = this.nodoPorId(ar.desdeNodoId);
    const b = this.nodoPorId(ar.haciaNodoId);
    if (!a || !b) {
      return null;
    }
    const { x, y } = puntoMedioBezierArista(a, b, ar.haciaPuerto, ar.desdePuerto);
    const t = raw
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '');
    if (t === 'si' || t === 'yes') {
      return { x, y, texto: 'Sí', clase: 'si' };
    }
    if (t === 'no') {
      return { x, y, texto: 'No', clase: 'no' };
    }
    return { x, y, texto: raw, clase: 'otro' };
  }

  anchoBadgeEtiqueta(texto: string): number {
    return Math.max(30, 14 + texto.length * 7.5);
  }

  seleccionarArista(ar: AristaCanvas, ev: Event): void {
    ev.stopPropagation();
    ev.preventDefault();
    this.seleccionId.set(null);
    this.conexionDesde.set(null);
    this.aristaSeleccionId.set(ar.id);
  }

  agregarNodo(tipo: NodoCanvasTipo): void {
    if (tipo === 'START' && this.tieneStart()) {
      this.snack.open('Ya existe un nodo START', 'Cerrar', { duration: 2500 });
      return;
    }
    const { x, y } = this.centroVisibleMundo();
    const base = etiquetaDefault(tipo);
    let n: NodoCanvas = {
      id: `nd-${uuid()}`,
      tipo,
      etiqueta: base,
      x,
      y,
    };
    if (tipo === 'ACTIVIDAD' && this.calles().length > 0) {
      const sorted = ordenarCalles(this.calles());
      const hit =
        this.orientacionCalles() === 'VERTICAL'
          ? hitTestCalleVertical(n.x, n.y, sorted)
          : hitTestCalleHorizontal(n.x, n.y, sorted);
      if (hit?.departamentoId) {
        n = {
          ...n,
          calleId: hit.id,
          departamento: hit.departamentoId,
          departamentoTexto: hit.nombre,
        };
      }
    }
    this.pushSnapshot();
    this.nodos.update((ns) => [...ns, n]);
    this.seleccionId.set(n.id);
    this.syncHistorialFlags();
  }

  seleccionarNodo(n: NodoCanvas, ev: Event): void {
    ev.stopPropagation();
    this.aristaSeleccionId.set(null);
    this.seleccionId.set(n.id);
    this.conexionDesde.set(null);
  }

  holderMinWidthStyle(): string | null {
    if (!this.calles().length) {
      return '100%';
    }
    if (this.orientacionCalles() === 'VERTICAL') {
      const vl = this.swimVerticalLayout();
      return vl ? `max(100%, ${vl.rightX + 400}px)` : '100%';
    }
    const hl = this.swimHorizontalLayout();
    return hl ? `max(100%, ${hl.contentW + 400}px)` : '100%';
  }

  holderMinHeightStyle(): string | null {
    if (this.orientacionCalles() === 'HORIZONTAL' && this.calles().length) {
      const hl = this.swimHorizontalLayout();
      return hl ? `max(100%, ${hl.bottomY + 400}px)` : '100%';
    }
    return '100%';
  }

  onSwimResizePointerDown(
    ev: PointerEvent,
    calle: CalleCanvas,
    axis: 'x' | 'y',
  ): void {
    ev.stopPropagation();
    ev.preventDefault();
    const lanes = this.callesOrdenadasVm();
    const idx = lanes.findIndex((c) => c.id === calle.id);
    const initialSize =
      axis === 'x'
        ? anchoCalleVertical(calle, idx)
        : altoCalleHorizontal(calle, idx);
    this.swimResizeDrag = {
      calleId: calle.id,
      axis,
      initialClient: axis === 'x' ? ev.clientX : ev.clientY,
      initialSize,
    };
    (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
  }

  onFondoPointerDown(ev: PointerEvent): void {
    if (ev.button !== 0) return;
    if (this.swimResizeDrag) return;
    const t = ev.target as Element | null;
    if (!t?.classList.contains('pd-canvas-bg')) return;
    this.panPrevia = { x: this.panX(), y: this.panY() };
    this.panArrastre = {
      sx: ev.clientX,
      sy: ev.clientY,
      ox: this.panX(),
      oy: this.panY(),
    };
    ev.preventDefault();
  }

  @HostListener('document:pointermove', ['$event'])
  onDocPointerMove(ev: PointerEvent): void {
    const r = this.swimResizeDrag;
    if (r) {
      ev.preventDefault();
      const z = this.zoom();
      if (r.axis === 'x') {
        const dw = (ev.clientX - r.initialClient) / z;
        const next = Math.max(LANE_MIN_W_RESIZE, r.initialSize + dw);
        this.calles.update((arr) =>
          arr.map((c) => (c.id === r.calleId ? { ...c, anchoPx: next } : c)),
        );
      } else {
        const dh = (ev.clientY - r.initialClient) / z;
        const next = Math.max(LANE_MIN_H_RESIZE, r.initialSize + dh);
        this.calles.update((arr) =>
          arr.map((c) => (c.id === r.calleId ? { ...c, altoPx: next } : c)),
        );
      }
      return;
    }
    const p = this.panArrastre;
    if (!p) return;
    this.panX.set(p.ox + (ev.clientX - p.sx));
    this.panY.set(p.oy + (ev.clientY - p.sy));
  }

  @HostListener('document:pointerup')
  onDocPointerUp(): void {
    if (this.swimResizeDrag) {
      this.pushSnapshot();
      this.syncHistorialFlags();
      this.swimResizeDrag = null;
      return;
    }
    const prev = this.panPrevia;
    if (this.panArrastre && prev) {
      if (this.panX() !== prev.x || this.panY() !== prev.y) {
        this.pushSnapshot();
        this.syncHistorialFlags();
      }
    }
    this.panArrastre = null;
    this.panPrevia = null;
  }

  onCanvasWheel(ev: WheelEvent): void {
    ev.preventDefault();
    const step = ev.deltaY > 0 ? -0.08 : 0.08;
    const z = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, this.zoom() + step));
    this.zoom.set(z);
    queueMicrotask(() => this.refreshMinimapViewport());
  }

  refreshMinimapViewport(): void {
    const scroll = this.canvasScrollRef()?.nativeElement;
    if (!scroll) {
      this.minimapViewport.set(null);
      return;
    }
    const nodos = this.nodos();
    const vl = this.swimVerticalLayout();
    const hl = this.swimHorizontalLayout();
    const b = computeWorldBounds(nodos, vl, hl);
    const wb = Math.max(1e-6, b.maxX - b.minX);
    const hb = Math.max(1e-6, b.maxY - b.minY);
    const sl = scroll.scrollLeft;
    const st = scroll.scrollTop;
    const cw = Math.max(1, scroll.clientWidth);
    const ch = Math.max(1, scroll.clientHeight);
    const z = this.zoom();
    const px0 = (sl - this.panX()) / z;
    const px1 = (sl + cw - this.panX()) / z;
    const py0 = (st - this.panY()) / z;
    const py1 = (st + ch - this.panY()) / z;
    const mx0 = ((px0 - b.minX) / wb) * MINIMAP_W;
    const mx1 = ((px1 - b.minX) / wb) * MINIMAP_W;
    const my0 = ((py0 - b.minY) / hb) * MINIMAP_H;
    const my1 = ((py1 - b.minY) / hb) * MINIMAP_H;
    const rx0 = Math.min(mx0, mx1);
    const rx1 = Math.max(mx0, mx1);
    const ry0 = Math.min(my0, my1);
    const ry1 = Math.max(my0, my1);
    const x = Math.max(0, Math.min(MINIMAP_W, rx0));
    const y = Math.max(0, Math.min(MINIMAP_H, ry0));
    const w = Math.max(3, Math.min(MINIMAP_W - x, rx1 - rx0));
    const h = Math.max(3, Math.min(MINIMAP_H - y, ry1 - ry0));
    this.minimapViewport.set({ x, y, w, h });
  }

  onCanvasScroll(): void {
    this.refreshMinimapViewport();
  }

  onMinimapClick(ev: MouseEvent): void {
    ev.stopPropagation();
    const el = ev.currentTarget as HTMLElement | null;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const rw = rect.width || MINIMAP_W;
    const rh = rect.height || MINIMAP_H;
    const mx = ((ev.clientX - rect.left) / rw) * MINIMAP_W;
    const my = ((ev.clientY - rect.top) / rh) * MINIMAP_H;
    if (mx < 0 || my < 0 || mx > MINIMAP_W || my > MINIMAP_H) return;
    const scroll = this.canvasScrollRef()?.nativeElement;
    if (!scroll) return;
    const nodos = this.nodos();
    const vl = this.swimVerticalLayout();
    const hl = this.swimHorizontalLayout();
    const b = computeWorldBounds(nodos, vl, hl);
    const wb = Math.max(1e-6, b.maxX - b.minX);
    const bh = Math.max(1e-6, b.maxY - b.minY);
    const wx = b.minX + (mx / MINIMAP_W) * wb;
    const wy = b.minY + (my / MINIMAP_H) * bh;
    const cw = Math.max(1, scroll.clientWidth);
    const ch = Math.max(1, scroll.clientHeight);
    const z = this.zoom();
    this.panX.set(scroll.scrollLeft + cw / 2 - z * wx);
    this.panY.set(scroll.scrollTop + ch / 2 - z * wy);
    queueMicrotask(() => this.refreshMinimapViewport());
  }

  centrarVista(): void {
    const scroll = this.canvasScrollRef()?.nativeElement;
    if (!scroll) return;
    const nodos = this.nodos();
    const vl = this.swimVerticalLayout();
    const hl = this.swimHorizontalLayout();
    const b = computeWorldBounds(nodos, vl, hl);
    const bw = Math.max(1, b.maxX - b.minX);
    const bh = Math.max(1, b.maxY - b.minY);
    const cw = Math.max(1, scroll.clientWidth);
    const ch = Math.max(1, scroll.clientHeight);
    const margin = 0.88;
    const z = Math.min(
      ZOOM_MAX,
      Math.max(ZOOM_MIN, margin * Math.min(cw / bw, ch / bh)),
    );
    const cx = (b.minX + b.maxX) / 2;
    const cy = (b.minY + b.maxY) / 2;
    this.pushSnapshot();
    this.zoom.set(z);
    scroll.scrollTop = 0;
    scroll.scrollLeft = 0;
    this.panX.set(cw / 2 - z * cx);
    this.panY.set(ch / 2 - z * cy);
    this.syncHistorialFlags();
    queueMicrotask(() => this.refreshMinimapViewport());
  }

  resetZoomAl100(): void {
    const scroll = this.canvasScrollRef()?.nativeElement;
    const z0 = this.zoom();
    const z1 = 1;
    if (scroll && Math.abs(z0 - z1) > 1e-6) {
      const cw = Math.max(1, scroll.clientWidth);
      const ch = Math.max(1, scroll.clientHeight);
      const sl = scroll.scrollLeft;
      const st = scroll.scrollTop;
      const cx = sl + cw / 2;
      const cy = st + ch / 2;
      const wx = (cx - this.panX()) / z0;
      const wy = (cy - this.panY()) / z0;
      this.pushSnapshot();
      this.zoom.set(1);
      this.panX.set(cx - wx);
      this.panY.set(cy - wy);
      this.syncHistorialFlags();
    } else {
      this.zoom.set(1);
    }
    queueMicrotask(() => this.refreshMinimapViewport());
  }

  onDragEnd(ev: CdkDragEnd, n: NodoCanvas): void {
    const z = this.zoom();
    const { x, y } = ev.distance;
    const dx = x / z;
    const dy = y / z;
    const nx = n.x + dx;
    const ny = n.y + dy;
    let actualizado: NodoCanvas = { ...n, x: nx, y: ny };
    if (n.tipo === 'ACTIVIDAD' && this.calles().length > 0) {
      const sorted = ordenarCalles(this.calles());
      const hit =
        this.orientacionCalles() === 'VERTICAL'
          ? hitTestCalleVertical(nx, ny, sorted)
          : hitTestCalleHorizontal(nx, ny, sorted);
      if (hit?.departamentoId) {
        actualizado = {
          ...actualizado,
          calleId: hit.id,
          departamento: hit.departamentoId,
          departamentoTexto: hit.nombre,
        };
        this.flashCalleId.set(hit.id);
        window.setTimeout(() => this.flashCalleId.set(null), 650);
      } else {
        actualizado = {
          ...actualizado,
          calleId: undefined,
          departamento: undefined,
          departamentoTexto: undefined,
        };
      }
    }
    this.pushSnapshot();
    this.nodos.update((arr) =>
      arr.map((node) => (node.id === n.id ? actualizado : node)),
    );
    ev.source.reset();
    this.syncHistorialFlags();
  }

  onPuertoClick(
    n: NodoCanvas,
    puerto: 'in' | 'out',
    ev: MouseEvent,
    inLado?: AristaHaciaPuerto,
    outLado?: AristaHaciaPuerto,
  ): void {
    ev.stopPropagation();
    ev.preventDefault();
    const origen = this.conexionDesde();

    if (puerto === 'out') {
      if (n.tipo === 'DECISION') {
        const salientesOut = this.aristas().filter((a) => a.desdeNodoId === n.id);
        if (salientesOut.length >= 2) {
          this.snack.open(MSG_DECISION_MAX_SALIENTES, 'Cerrar', {
            duration: 4000,
          });
          return;
        }
      }
      if (n.tipo === 'FORK_BAR') {
        let lado: AristaHaciaPuerto = outLado ?? 'E';
        if (lado === 'O') {
          lado = 'E';
        }
        this.conexionDesde.set({
          nodoId: n.id,
          puerto: 'out',
          forkOutLado: lado,
        });
        return;
      }
      this.conexionDesde.set({ nodoId: n.id, puerto: 'out' });
      return;
    }

    if (puerto === 'in' && origen) {
      if (origen.nodoId === n.id) {
        this.conexionDesde.set(null);
        return;
      }
      const nodoOrigen = this.nodoPorId(origen.nodoId);
      const salientesDesdeOrigen = this.aristas().filter(
        (a) => a.desdeNodoId === origen.nodoId,
      );
      if (nodoOrigen?.tipo === 'DECISION' && salientesDesdeOrigen.length >= 2) {
        this.snack.open(MSG_DECISION_MAX_SALIENTES, 'Cerrar', {
          duration: 4000,
        });
        this.conexionDesde.set(null);
        return;
      }
      const ladoDestino =
        n.tipo === 'DECISION' || n.tipo === 'JOIN_BAR'
          ? (inLado ?? 'O')
          : undefined;
      const existe = this.aristas().some((a) => {
        if (a.desdeNodoId !== origen.nodoId || a.haciaNodoId !== n.id) {
          return false;
        }
        if (n.tipo === 'DECISION' || n.tipo === 'JOIN_BAR') {
          const pa = a.haciaPuerto ?? 'O';
          return pa === ladoDestino;
        }
        if (nodoOrigen?.tipo === 'FORK_BAR') {
          const da = a.desdePuerto ?? 'E';
          const db = origen.forkOutLado ?? 'E';
          return da === db;
        }
        return true;
      });
      if (existe) {
        this.snack.open('Esa conexión ya existe', 'Cerrar', { duration: 2000 });
        this.conexionDesde.set(null);
        return;
      }
      this.pushSnapshot();
      const etiquetaDesdeDecision =
        nodoOrigen?.tipo === 'DECISION' && salientesDesdeOrigen.length === 1
          ? etiquetaAutomaticaSegundaSalidaDecision(salientesDesdeOrigen)
          : undefined;
      const desdeFork = nodoOrigen?.tipo === 'FORK_BAR';
      const nueva: AristaCanvas = {
        id: `ar-${uuid()}`,
        desdeNodoId: origen.nodoId,
        haciaNodoId: n.id,
        ...(etiquetaDesdeDecision ? { etiqueta: etiquetaDesdeDecision } : {}),
        ...(n.tipo === 'DECISION'
          ? { haciaPuerto: ladoDestino as AristaHaciaPuerto }
          : {}),
        ...(n.tipo === 'JOIN_BAR'
          ? { haciaPuerto: (ladoDestino ?? 'O') as AristaHaciaPuerto }
          : {}),
        ...(desdeFork
          ? { desdePuerto: (origen.forkOutLado ?? 'E') as AristaHaciaPuerto }
          : {}),
      };
      this.aristas.update((as) => [...as, nueva]);
      this.conexionDesde.set(null);
      this.syncHistorialFlags();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(ev: KeyboardEvent): void {
    if (ev.key === 'Escape') {
      this.conexionDesde.set(null);
      return;
    }
    if (ev.key === 'Delete' || ev.key === 'Backspace') {
      const t = ev.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.isContentEditable)
      ) {
        return;
      }
      if (this.aristaSeleccionId()) {
        ev.preventDefault();
        this.eliminarAristaSeleccionada();
      }
    }
  }

  clickCanvas(ev: MouseEvent): void {
    if ((ev.target as Element).closest('.pd-node-root')) return;
    if ((ev.target as Element).closest('.pd-arista-g')) return;
    this.seleccionId.set(null);
    this.aristaSeleccionId.set(null);
  }

  guardar(): void {
    if (!this.politicaId) {
      this.snack.open('Política sin id: no se puede guardar', 'Cerrar', {
        duration: 3500,
      });
      return;
    }
    const v = this.buildValidation(this.nodos(), this.aristas());
    if (v.tieneErrores) {
      this.snack.open('Corregí los errores antes de guardar', 'Cerrar', {
        duration: 4500,
      });
      return;
    }
    this.ejecutarGuardadoPolitica();
  }

  deshacer(): void {
    const snap = this.historialPasado.pop();
    if (!snap) return;
    this.historialFuturo.push(this.capturarSnapshot());
    this.restaurarSnapshot(snap);
    this.syncHistorialFlags();
  }

  rehacer(): void {
    const snap = this.historialFuturo.pop();
    if (!snap) return;
    this.historialPasado.push(this.capturarSnapshot());
    this.restaurarSnapshot(snap);
    this.syncHistorialFlags();
  }

  validar(): void {
    const data = this.buildValidation(this.nodos(), this.aristas());
    this.dialog
      .open(ValidationResultDialogComponent, {
        width: '560px',
        maxWidth: '95vw',
        data,
      })
      .afterClosed()
      .pipe(take(1))
      .subscribe((r) => {
        if (r === 'guardar') {
          this.ejecutarGuardadoPolitica();
        }
      });
  }

  /** Persiste la política (tras validar sin errores). */
  private ejecutarGuardadoPolitica(): void {
    if (!this.politicaId) {
      this.snack.open('Política sin id: no se puede guardar', 'Cerrar', {
        duration: 3500,
      });
      return;
    }
    const nodos = this.nodos().map(mapCanvasToNodo);
    const aristas = this.aristas().map((a) => ({ ...a })) as Arista[];
    const base = this.politicaBase ?? ({} as Politica);
    const politica: Politica = {
      ...base,
      id: this.politicaId,
      nombre: this.nombrePolitica(),
      activa: base.activa ?? true,
      nodos,
      aristas,
      callesDiseno: this.calles().map((c) => ({ ...c })),
      orientacionCalles: this.orientacionCalles(),
    };
    this.politicaService
      .actualizarPolitica(this.politicaId, politica)
      .subscribe(() => {
        this.snack.open('Política guardada correctamente', 'Cerrar', {
          duration: 2800,
        });
        console.log(JSON.stringify({ nodos, aristas }, null, 2));
        // TODO: reemplazar console.log por llamada HTTP al API cuando el backend esté listo
      });
  }

  /**
   * Evalúa reglas de negocio del diagrama (errores bloquean guardar).
   */
  buildValidation(
    nodos: NodoCanvas[],
    aristas: AristaCanvas[],
  ): ValidacionFlujoResultado {
    return buildValidationFlujo(nodos, aristas);
  }

  volver(): void {
    void this.router.navigate(['/admin/politicas']);
  }

  irADisenarFormulario(nodoActividadId: string): void {
    const pid = this.politicaRutaId();
    if (!pid) return;
    void this.router.navigate([
      '/admin/politicas',
      pid,
      'formulario',
      nodoActividadId,
    ]);
  }

  onNombrePoliticaBlur(): void {
    this.pushSnapshot();
    this.syncHistorialFlags();
  }

  setNombrePolitica(v: string): void {
    this.nombrePolitica.set(v);
  }

  commitPropiedadesNodo(): void {
    this.pushSnapshot();
    this.syncHistorialFlags();
  }

  patchEtiqueta(v: string): void {
    const id = this.seleccionId();
    if (!id) return;
    this.nodos.update((arr) =>
      arr.map((n) => (n.id === id ? { ...n, etiqueta: v } : n)),
    );
  }

  patchDepartamentoActividad(depId: string): void {
    const id = this.seleccionId();
    if (!id) return;
    const n = this.nodos().find((x) => x.id === id);
    if (!n || n.tipo !== 'ACTIVIDAD') return;
    const trimmed = (depId ?? '').trim();
    const dept = trimmed
      ? this.departamentosLista().find((d) => d.id === trimmed)
      : undefined;
    this.pushSnapshot();
    this.nodos.update((arr) =>
      arr.map((x) => {
        if (x.id !== id) return x;
        if (!dept?.id) {
          return {
            ...x,
            departamento: undefined,
            departamentoTexto: undefined,
            calleId: undefined,
          };
        }
        const calle = this.calles().find((c) => c.departamentoId === dept.id);
        return {
          ...x,
          departamento: dept.id,
          departamentoTexto: dept.nombre,
          calleId: calle?.id ?? x.calleId,
        };
      }),
    );
    this.syncHistorialFlags();
  }

  tieneCalleParaDepartamento(depId: string | undefined): boolean {
    if (!depId) return false;
    return this.calles().some((c) => c.departamentoId === depId);
  }

  agregarCalleDesdeDepartamento(d: Departamento): void {
    if (!d.id) return;
    const existente = this.calles().find((c) => c.departamentoId === d.id);
    if (existente) {
      this.resaltarCalleId.set(existente.id);
      if (this.resaltarTimer) clearTimeout(this.resaltarTimer);
      this.resaltarTimer = window.setTimeout(() => {
        this.resaltarCalleId.set(null);
        this.resaltarTimer = null;
      }, 2000);
      return;
    }
    const colores = ['#e3f2fd', '#e8f5e9', '#fff9c4', '#f3e5f5', '#ffe0b2'];
    const orden = this.calles().length;
    const calle: CalleCanvas = {
      id: `cal-${uuid()}`,
      nombre: d.nombre,
      color: colores[orden % colores.length],
      orden,
      departamentoId: d.id,
      anchoPx: orden === 0 ? 300 : 250,
      altoPx: orden === 0 ? 300 : 250,
    };
    this.pushSnapshot();
    this.calles.update((c) => [...c, calle]);
    this.sincronizarCallesEnActividades();
    this.syncHistorialFlags();
  }

  /** Asocia calleId en actividades según departamento cuando hay calles en el lienzo */
  private sincronizarCallesEnActividades(): void {
    if (!this.calles().length) return;
    const lanes = this.calles();
    this.nodos.update((ns) =>
      ns.map((n) => {
        if (n.tipo !== 'ACTIVIDAD' || !n.departamento) return n;
        const c = lanes.find((l) => l.departamentoId === n.departamento);
        return { ...n, calleId: c?.id };
      }),
    );
  }

  onClickDepartamentoPaleta(d: Departamento): void {
    this.agregarCalleDesdeDepartamento(d);
  }

  onDeptoCalleCheckbox(d: Departamento, ev: MatCheckboxChange): void {
    if (!d.id) return;
    if (ev.checked) {
      this.agregarCalleDesdeDepartamento(d);
    } else {
      this.intentarEliminarCallePorDepartamento(d.id);
    }
  }

  agregarCalleRapida(): void {
    const deps = this.departamentosLista().filter((x) => x.activo && x.id);
    const libre = deps.find(
      (d) => !this.calles().some((c) => c.departamentoId === d.id),
    );
    if (!libre) {
      this.snack.open(
        'No hay más departamentos activos para agregar como calle',
        'Cerrar',
        { duration: 3200 },
      );
      return;
    }
    this.agregarCalleDesdeDepartamento(libre);
  }

  setOrientacionCalles(o: OrientacionCalles): void {
    if (this.orientacionCalles() === o) return;
    this.pushSnapshot();
    this.orientacionCalles.set(o);
    this.syncHistorialFlags();
  }

  eliminarCalleCabeceraClick(calleId: string, ev: Event): void {
    ev.stopPropagation();
    ev.preventDefault();
    this.intentarEliminarCallePorId(calleId);
  }

  private intentarEliminarCallePorDepartamento(departamentoId: string): void {
    const c = this.calles().find((x) => x.departamentoId === departamentoId);
    if (c) this.intentarEliminarCallePorId(c.id);
  }

  private intentarEliminarCallePorId(calleId: string): void {
    const ocupada = this.nodos().some(
      (n) => n.tipo === 'ACTIVIDAD' && n.calleId === calleId,
    );
    if (ocupada) {
      this.snack.open(
        'Mové los nodos antes de eliminar esta calle',
        'Cerrar',
        { duration: 4200 },
      );
      return;
    }
    this.pushSnapshot();
    this.calles.update((c) => c.filter((x) => x.id !== calleId));
    this.syncHistorialFlags();
  }

  patchParaleloItem(
    i: number,
    campo: 'nombre' | 'depto',
    v: string,
  ): void {
    this.wizardParaleloItems.update((arr) =>
      arr.map((row, j) => (j === i ? { ...row, [campo]: v } : row)),
    );
  }

  patchSla(v: number | string | null): void {
    const id = this.seleccionId();
    if (!id) return;
    const num =
      v === '' || v === null || v === undefined ? NaN : Number(v);
    const sla =
      Number.isFinite(num) && num > 0 ? Math.round(num) : undefined;
    this.nodos.update((arr) =>
      arr.map((n) => (n.id === id ? { ...n, slaMinutos: sla } : n)),
    );
  }

  modoConexion(): boolean {
    return this.conexionDesde() != null;
  }

  puertoOrigenActivo(n: NodoCanvas): boolean {
    const o = this.conexionDesde();
    return o != null && o.nodoId === n.id && n.tipo !== 'FORK_BAR';
  }

  puertoOrigenActivoFork(n: NodoCanvas, lado: AristaHaciaPuerto): boolean {
    const o = this.conexionDesde();
    if (o == null || o.nodoId !== n.id || n.tipo !== 'FORK_BAR') {
      return false;
    }
    return (o.forkOutLado ?? 'E') === lado;
  }

  eliminarNodoSeleccionado(): void {
    const n = this.nodoSeleccionado();
    if (!n || n.tipo === 'START') return;
    this.pushSnapshot();
    const id = n.id;
    this.nodos.update((arr) => arr.filter((x) => x.id !== id));
    this.aristas.update((arr) =>
      arr.filter((a) => a.desdeNodoId !== id && a.haciaNodoId !== id),
    );
    this.seleccionId.set(null);
    this.aristaSeleccionId.set(null);
    this.syncHistorialFlags();
  }

  eliminarAristaSeleccionada(): void {
    const id = this.aristaSeleccionId();
    if (!id) return;
    this.pushSnapshot();
    this.aristas.update((arr) => arr.filter((a) => a.id !== id));
    this.aristaSeleccionId.set(null);
    this.syncHistorialFlags();
  }

  /** Valor para mat-select Sí/No (arista desde DECISIÓN). */
  etiquetaDecisionSelectValue(ar: AristaCanvas): string {
    const raw = (ar.etiqueta ?? '').trim();
    const t = raw
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '');
    if (t === 'si' || t === 'yes') return 'Sí';
    if (t === 'no') return 'No';
    return '';
  }

  onEtiquetaDecisionChange(val: string): void {
    const id = this.aristaSeleccionId();
    if (!id) return;
    const etiqueta = val === 'Sí' || val === 'No' ? val : '';
    this.pushSnapshot();
    this.aristas.update((arr) =>
      arr.map((a) => (a.id === id ? { ...a, etiqueta: etiqueta || undefined } : a)),
    );
    this.syncHistorialFlags();
  }

  tipoLabel(t: NodoCanvasTipo): string {
    return t;
  }

  reiniciarWizardFormulario(): void {
    this.wizardPaso.set(1);
    this.wizardAddTipo.set(null);
    this.wizardFlujo.set(null);
    this.wizardCondicion.set('');
    this.wizardNombreActividad.set('');
    this.wizardDeptoActividad.set('');
    this.wizardParaleloCount.set(2);
    this.wizardParaleloItems.set([
      { nombre: 'Rama 1', depto: '' },
      { nombre: 'Rama 2', depto: '' },
    ]);
    this.wizardExistenteId.set('');
    this.wizardSiEsFin.set(false);
    this.wizardSiNombre.set('');
    this.wizardSiDepto.set('');
    this.wizardNoModo.set('actividad');
    this.wizardNoNombre.set('');
    this.wizardNoDepto.set('');
  }

  wizardElegirAgregar(tipo: 'ACTIVIDAD' | 'DECISION'): void {
    this.wizardAddTipo.set(tipo);
    this.wizardPaso.set(2);
  }

  wizardElegirFlujo(f: WizardFlujo): void {
    this.wizardFlujo.set(f);
    if (f === 'paralelo') {
      this.asegurarParaleloItems();
    }
  }

  wizardParaleloCountChange(n: number): void {
    const raw = Number.isFinite(n) ? Math.round(n) : this.wizardParaleloCount();
    const c = Math.min(5, Math.max(2, raw));
    this.wizardParaleloCount.set(c);
    this.asegurarParaleloItems();
  }

  private asegurarParaleloItems(): void {
    const n = this.wizardParaleloCount();
    const cur = this.wizardParaleloItems();
    const next: { nombre: string; depto: string }[] = [];
    for (let i = 0; i < n; i++) {
      next.push(
        cur[i] ?? { nombre: `Rama ${i + 1}`, depto: '' },
      );
    }
    this.wizardParaleloItems.set(next);
  }

  wizardAnterior(): void {
    const p = this.wizardPaso();
    if (p === 3) {
      this.wizardPaso.set(2);
      return;
    }
    if (p === 2) {
      this.wizardPaso.set(1);
      this.wizardAddTipo.set(null);
      this.wizardFlujo.set(null);
      this.wizardCondicion.set('');
    }
  }

  wizardSiguiente(): void {
    const o = this.nodoOrigenWizard();
    if (!o) {
      this.snack.open('Seleccioná un nodo en el diagrama', 'Cerrar', {
        duration: 2500,
      });
      return;
    }
    const tipo = this.wizardAddTipo();
    const paso = this.wizardPaso();
    if (paso === 2 && tipo === 'ACTIVIDAD') {
      if (!this.wizardFlujo()) {
        this.snack.open('Elegí cómo continúa el flujo', 'Cerrar', {
          duration: 2500,
        });
        return;
      }
      this.wizardPaso.set(3);
      return;
    }
    if (paso === 2 && tipo === 'DECISION') {
      if (!this.wizardCondicion().trim()) {
        this.snack.open('Ingresá el texto de la condición', 'Cerrar', {
          duration: 2500,
        });
        return;
      }
      this.wizardPaso.set(3);
    }
  }

  wizardAplicar(): void {
    const o = this.nodoOrigenWizard();
    if (!o) {
      this.snack.open('Seleccioná un nodo en el diagrama', 'Cerrar', {
        duration: 2500,
      });
      return;
    }
    const tipo = this.wizardAddTipo();
    if (tipo === 'ACTIVIDAD') {
      const flujo = this.wizardFlujo();
      if (!flujo) return;
      if (
        flujo === 'existente' &&
        this.actividadesParaEnlace().length === 0
      ) {
        this.snack.open(
          'No hay otras actividades: agregá una al diagrama primero',
          'Cerrar',
          { duration: 3500 },
        );
        return;
      }
      const ok =
        flujo === 'fin'
          ? true
          : flujo === 'directo'
          ? this.validarNombreDepto(this.wizardNombreActividad(), this.wizardDeptoActividad())
          : flujo === 'paralelo'
            ? this.wizardParaleloItems().every(
                (it) => this.validarNombreDepto(it.nombre, it.depto),
              )
            : !!this.wizardExistenteId() &&
              this.nodos().some((n) => n.id === this.wizardExistenteId());
      if (!ok) {
        this.snack.open('Completá los campos obligatorios', 'Cerrar', {
          duration: 3000,
        });
        return;
      }
      this.pushSnapshot();
      const ultimo = this.ejecutarWizardActividad(o, flujo);
      this.finalizarWizard(ultimo);
      return;
    }
    if (tipo === 'DECISION') {
      if (!this.validarRamaDecision()) {
        this.snack.open('Completá las ramas Sí / No', 'Cerrar', {
          duration: 3500,
        });
        return;
      }
      this.pushSnapshot();
      const ultimo = this.ejecutarWizardDecision(o);
      this.finalizarWizard(ultimo);
    }
  }

  private validarNombreDepto(nombre: string, depto: string): boolean {
    return nombre.trim().length > 0 && !!depto?.trim();
  }

  private validarRamaDecision(): boolean {
    if (this.wizardSiEsFin()) {
      /* ok */
    } else if (
      !this.validarNombreDepto(this.wizardSiNombre(), this.wizardSiDepto())
    ) {
      return false;
    }
    const modo = this.wizardNoModo();
    if (modo === 'fin') return true;
    if (modo === 'bucle') return true;
    return this.validarNombreDepto(this.wizardNoNombre(), this.wizardNoDepto());
  }

  private nodoOrigenWizard(): NodoCanvas | null {
    return this.nodoSeleccionado();
  }

  private ejecutarWizardActividad(
    origen: NodoCanvas,
    flujo: WizardFlujo,
  ): string {
    let nodos = [...this.nodos()];
    let aristas = [...this.aristas()];
    const pushN = (n: NodoCanvas) => {
      nodos = [...nodos, n];
    };
    const pushA = (
      desde: string,
      hacia: string,
      etiqueta?: string,
      haciaPuerto?: AristaHaciaPuerto,
      desdePuerto?: AristaHaciaPuerto,
    ) => {
      const hNode = nodos.find((x) => x.id === hacia);
      const desdeNode = nodos.find((x) => x.id === desde);
      const base: AristaCanvas = {
        id: `ar-${uuid()}`,
        desdeNodoId: desde,
        haciaNodoId: hacia,
        etiqueta,
      };
      let completo: AristaCanvas = base;
      if (hNode?.tipo === 'DECISION') {
        completo = { ...base, haciaPuerto: haciaPuerto ?? 'O' };
      } else if (hNode?.tipo === 'JOIN_BAR') {
        completo = { ...base, haciaPuerto: haciaPuerto ?? 'O' };
      }
      if (desdeNode?.tipo === 'FORK_BAR') {
        completo = { ...completo, desdePuerto: desdePuerto ?? 'E' };
      }
      aristas = [...aristas, completo];
    };

    let ultimoId = origen.id;

    if (flujo === 'existente') {
      const tid = this.wizardExistenteId();
      pushA(origen.id, tid);
      this.nodos.set(nodos);
      this.aristas.set(aristas);
      return tid;
    }

    if (flujo === 'directo') {
      const p = posicionDerechaOrigen(origen);
      const deptoId = this.wizardDeptoActividad();
      const a = crearNodoVacio(
        'ACTIVIDAD',
        p.x,
        p.y,
        this.wizardNombreActividad().trim(),
        `nd-${uuid()}`,
        deptoId,
        this.nombreDepartamento(deptoId),
      );
      pushN(a);
      pushA(origen.id, a.id);
      ultimoId = a.id;
      this.nodos.set(nodos);
      this.aristas.set(aristas);
      return ultimoId;
    }

    if (flujo === 'fin') {
      const p = posicionDerechaOrigen(origen);
      const r = this.obtenerOCrearFin(nodos, origen, p);
      nodos = r.nodos;
      let end = r.end;
      if (r.esNuevo) {
        end = { ...end, x: p.x, y: p.y };
        nodos = nodos.map((x) => (x.id === end.id ? end : x));
      }
      const yaAlFin = aristas.some(
        (a) => a.desdeNodoId === origen.id && a.haciaNodoId === end.id,
      );
      if (!yaAlFin) {
        pushA(origen.id, end.id);
      }
      ultimoId = end.id;
      this.nodos.set(nodos);
      this.aristas.set(aristas);
      return ultimoId;
    }

    // paralelo
    const pFork = posicionDerechaOrigen(origen);
    const fork = crearNodoVacio(
      'FORK_BAR',
      pFork.x,
      pFork.y,
      'Paralelo',
      `nd-${uuid()}`,
    );
    pushN(fork);
    pushA(origen.id, fork.id);
    const items = this.wizardParaleloItems();
    const posActs = posicionParalelas(fork, items.length);
    const actIds: string[] = [];
    const salidasFork: AristaHaciaPuerto[] = ['E', 'N', 'S'];
    for (let i = 0; i < items.length; i++) {
      const did = items[i].depto;
      const act = crearNodoVacio(
        'ACTIVIDAD',
        posActs[i].x,
        posActs[i].y,
        items[i].nombre.trim(),
        `nd-${uuid()}`,
        did,
        this.nombreDepartamento(did),
      );
      pushN(act);
      pushA(fork.id, act.id, undefined, undefined, salidasFork[i % 3]);
      actIds.push(act.id);
    }
    const posJ = posicionJoinDesdeActividades(
      actIds.map((id) => nodos.find((n) => n.id === id)!),
    );
    const join = crearNodoVacio(
      'JOIN_BAR',
      posJ.x,
      posJ.y,
      'Unir',
      `nd-${uuid()}`,
    );
    pushN(join);
    const entradasJoin: AristaHaciaPuerto[] = ['O', 'N', 'S'];
    for (let i = 0; i < actIds.length; i++) {
      pushA(actIds[i], join.id, undefined, entradasJoin[i % 3]);
    }
    ultimoId = join.id;
    this.nodos.set(nodos);
    this.aristas.set(aristas);
    return ultimoId;
  }

  private ejecutarWizardDecision(origen: NodoCanvas): string {
    let nodos = [...this.nodos()];
    let aristas = [...this.aristas()];
    const pushN = (n: NodoCanvas) => {
      nodos = [...nodos, n];
    };
    const pushA = (
      desde: string,
      hacia: string,
      etiqueta?: string,
      haciaPuerto?: AristaHaciaPuerto,
      desdePuerto?: AristaHaciaPuerto,
    ) => {
      const hNode = nodos.find((x) => x.id === hacia);
      const desdeNode = nodos.find((x) => x.id === desde);
      const base: AristaCanvas = {
        id: `ar-${uuid()}`,
        desdeNodoId: desde,
        haciaNodoId: hacia,
        etiqueta,
      };
      let completo: AristaCanvas = base;
      if (hNode?.tipo === 'DECISION') {
        completo = { ...base, haciaPuerto: haciaPuerto ?? 'O' };
      } else if (hNode?.tipo === 'JOIN_BAR') {
        completo = { ...base, haciaPuerto: haciaPuerto ?? 'O' };
      }
      if (desdeNode?.tipo === 'FORK_BAR') {
        completo = { ...completo, desdePuerto: desdePuerto ?? 'E' };
      }
      aristas = [...aristas, completo];
    };

    const pD = posicionDerechaOrigen(origen);
    const dec = crearNodoVacio(
      'DECISION',
      pD.x,
      pD.y,
      this.wizardCondicion().trim(),
      `nd-${uuid()}`,
    );
    pushN(dec);
    pushA(origen.id, dec.id, undefined, 'O');

    let ultimoId = dec.id;
    const baseY = dec.y;
    const siPos = { x: dec.x + 220, y: baseY - 90 };
    const noPos = { x: dec.x + 220, y: baseY + 90 };

    if (this.wizardSiEsFin()) {
      const r = this.obtenerOCrearFin(nodos, dec, siPos);
      nodos = r.nodos;
      let end = r.end;
      if (r.esNuevo) {
        end = { ...end, x: siPos.x, y: siPos.y };
        nodos = nodos.map((x) => (x.id === end.id ? end : x));
      }
      pushA(dec.id, end.id, 'Sí');
      ultimoId = end.id;
    } else {
      const siDepto = this.wizardSiDepto();
      const sa = crearNodoVacio(
        'ACTIVIDAD',
        siPos.x,
        siPos.y,
        this.wizardSiNombre().trim(),
        `nd-${uuid()}`,
        siDepto,
        this.nombreDepartamento(siDepto),
      );
      pushN(sa);
      pushA(dec.id, sa.id, 'Sí');
      ultimoId = sa.id;
    }

    const modo = this.wizardNoModo();
    if (modo === 'fin') {
      const r = this.obtenerOCrearFin(nodos, dec, noPos);
      nodos = r.nodos;
      let end = r.end;
      if (r.esNuevo) {
        end = { ...end, x: noPos.x, y: noPos.y };
        nodos = nodos.map((x) => (x.id === end.id ? end : x));
      }
      pushA(dec.id, end.id, 'No');
      ultimoId = end.id;
    } else if (modo === 'bucle') {
      pushA(dec.id, dec.id, 'No');
      ultimoId = dec.id;
    } else {
      const noDepto = this.wizardNoDepto();
      const na = crearNodoVacio(
        'ACTIVIDAD',
        noPos.x,
        noPos.y,
        this.wizardNoNombre().trim(),
        `nd-${uuid()}`,
        noDepto,
        this.nombreDepartamento(noDepto),
      );
      pushN(na);
      pushA(dec.id, na.id, 'No');
      ultimoId = na.id;
    }

    this.nodos.set(nodos);
    this.aristas.set(aristas);
    return ultimoId;
  }

  private obtenerOCrearFin(
    nodos: NodoCanvas[],
    ref: NodoCanvas,
    prefPos?: { x: number; y: number },
  ): { nodos: NodoCanvas[]; end: NodoCanvas; esNuevo: boolean } {
    const existente = nodos.find((n) => n.tipo === 'END');
    if (existente) {
      return { nodos, end: existente, esNuevo: false };
    }
    const pos = prefPos ?? posicionFinDesde(ref, nodos);
    const end = crearNodoVacio('END', pos.x, pos.y, 'Fin', `nd-${uuid()}`);
    return { nodos: [...nodos, end], end, esNuevo: true };
  }

  private finalizarWizard(ultimoNodoId: string): void {
    this.sincronizarCallesEnActividades();
    this.syncHistorialFlags();
    this.seleccionId.set(ultimoNodoId);
    this.reiniciarWizardFormulario();
    this.snack.open('Cambios aplicados al diagrama', 'Cerrar', {
      duration: 2200,
    });
  }

  aplicarIaDiagrama(): void {
    const instruccion = this.iaInstruccion().trim();
    if (!instruccion || this.iaEnviando()) return;
    this.iaEnviando.set(true);
    const nodosCanvas = this.nodos();
    const aristasCanvas = this.aristas();
    const nodosPayload = nodosCanvas.map(mapCanvasToNodo);
    const aristasPayload = aristasCanvas.map(mapCanvasToArista);
    const req$ =
      nodosCanvas.length > 0
        ? this.iaService.editarDiagrama(
            instruccion,
            nodosPayload,
            aristasPayload,
          )
        : this.iaService.generarDiagrama(instruccion);
    req$
      .pipe(
        take(1),
        finalize(() => this.iaEnviando.set(false)),
      )
      .subscribe({
        next: (resp) => {
          const nodosIa = Array.isArray(resp.nodos) ? resp.nodos : [];
          const aristasIa = Array.isArray(resp.aristas) ? resp.aristas : [];
          let mappedNodos = nodosIa.map((raw) =>
            this.mapearNodoIaDesdeApi(raw as Record<string, unknown>),
          );
          const dptosUnicos = [
            ...new Set(
              mappedNodos
                .map((n) => n.departamento?.trim())
                .filter((id): id is string => Boolean(id)),
            ),
          ];
          for (const deptId of dptosUnicos) {
            if (this.calles().some((c) => c.departamentoId === deptId)) continue;
            const d = this.departamentosLista().find((x) => x.id === deptId);
            if (d) this.agregarCalleDesdeDepartamento(d);
          }
          const mappedAristas = aristasIa.map((raw) =>
            this.mapearAristaIaDesdeApi(raw as Record<string, unknown>),
          );
          mappedNodos = this.reposicionarNodosIaEnCalles(mappedNodos, mappedAristas);
          this.pushSnapshot();
          this.nodos.set(mappedNodos);
          this.aristas.set(mappedAristas);
          this.sincronizarCallesEnActividades();
          this.syncHistorialFlags();
          this.centrarVista();
          this.snack.open('✨ Diagrama actualizado con IA', 'Cerrar', {
            duration: 3200,
          });
        },
        error: () => {
          this.snack.open('Error al conectar con el asistente IA', 'Cerrar', {
            duration: 4000,
          });
        },
      });
  }

  iaAlternarMicrofono(): void {
    if (this.iaEscuchandoVoz()) {
      this.detenerIaReconocimiento();
      return;
    }
    const W = globalThis as unknown as {
      webkitSpeechRecognition?: new () => RecVoz;
      SpeechRecognition?: new () => RecVoz;
    };
    const SR = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!SR) {
      this.snack.open('Reconocimiento de voz no disponible en este navegador', 'Cerrar', {
        duration: 4000,
      });
      return;
    }
    try {
      const rec = new SR();
      rec.lang = 'es-ES';
      rec.continuous = false;
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onresult = (ev) => {
        const tx = ev.results[0]?.[0]?.transcript?.trim() ?? '';
        if (tx) {
          this.iaInstruccion.update((b) => (b ? `${b} ${tx}` : tx));
        }
        this.detenerIaReconocimiento();
      };
      rec.onerror = () => this.detenerIaReconocimiento();
      rec.onend = () => this.iaEscuchandoVoz.set(false);
      this.iaReconocimiento = rec;
      this.iaEscuchandoVoz.set(true);
      rec.start();
    } catch {
      this.snack.open('No se pudo iniciar el micrófono', 'Cerrar', {
        duration: 3000,
      });
      this.iaEscuchandoVoz.set(false);
    }
  }

  private detenerIaReconocimiento(): void {
    try {
      this.iaReconocimiento?.stop();
    } catch {
      /* ignore */
    }
    this.iaReconocimiento = null;
    this.iaEscuchandoVoz.set(false);
  }

  private mapearNodoIaDesdeApi(raw: Record<string, unknown>): NodoCanvas {
    const x = Number(raw['posicionX'] ?? raw['x'] ?? 100);
    const y = Number(raw['posicionY'] ?? raw['y'] ?? 100);
    const tipo = normalizeNodoTipo(String(raw['tipo'] ?? 'ACTIVIDAD'));
    const id = String(raw['id'] ?? `nd-${uuid()}`);
    const etiqueta = String(raw['etiqueta'] ?? '');
    const slaRaw = raw['slaMinutos'];
    const slaNum =
      slaRaw === null || slaRaw === undefined || slaRaw === ''
        ? undefined
        : Number(slaRaw);
    const deptNombreRaw = raw['departamento'];
    const deptNombre =
      deptNombreRaw != null && String(deptNombreRaw).trim() !== ''
        ? String(deptNombreRaw).trim()
        : '';
    const n: NodoCanvas = {
      id,
      tipo,
      etiqueta,
      x: Number.isFinite(x) ? x : 100,
      y: Number.isFinite(y) ? y : 100,
    };
    if (tipo === 'ACTIVIDAD' && Number.isFinite(slaNum as number)) {
      n.slaMinutos = slaNum as number;
    }
    if (tipo === 'ACTIVIDAD' && deptNombre) {
      const d = this.departamentosLista().find(
        (dep) =>
          dep.nombre?.trim().toLowerCase() === deptNombre.toLowerCase(),
      );
      if (d?.id) {
        n.departamento = d.id;
        n.departamentoTexto = d.nombre;
        const calle = this.calles().find((c) => c.departamentoId === d.id);
        if (calle) n.calleId = calle.id;
      } else {
        n.departamentoTexto = deptNombre;
      }
    }
    return n;
  }

  private mapearAristaIaDesdeApi(raw: Record<string, unknown>): AristaCanvas {
    return {
      id: String(raw['id'] ?? `ar-${uuid()}`),
      desdeNodoId: String(raw['desdeNodoId'] ?? ''),
      haciaNodoId: String(raw['haciaNodoId'] ?? ''),
      etiqueta:
        raw['etiqueta'] != null && String(raw['etiqueta']).trim() !== ''
          ? String(raw['etiqueta'])
          : undefined,
    };
  }

  /**
   * Tras importar nodos desde la IA: reparte actividades por calle (vertical),
   * luego coloca START, END y DECISION según el diagrama y las aristas.
   */
  private reposicionarNodosIaEnCalles(
    nodos: NodoCanvas[],
    aristas: AristaCanvas[],
  ): NodoCanvas[] {
    const IA_LANE_Y0 = 150;
    const IA_LANE_GAP = 80;

    if (!this.calles().length) return nodos;

    const out = nodos.map((n) => ({ ...n }));
    const byId = new Map(out.map((n) => [n.id, n]));

    const findVerticalItem = (
      n: NodoCanvas,
      vl: NonNullable<ReturnType<PolicyDesignerComponent['swimVerticalLayout']>>,
    ) => {
      const deptId = n.departamento?.trim();
      if (!deptId) return null;
      return (
        (n.calleId
          ? vl.items.find((it) => it.calle.id === n.calleId)
          : undefined) ??
        vl.items.find((it) => it.calle.departamentoId === deptId) ??
        null
      );
    };

    if (this.orientacionCalles() === 'VERTICAL') {
      const vl = this.swimVerticalLayout();
      if (!vl?.items.length) return nodos;

      for (const item of vl.items) {
        const laneDept = item.calle.departamentoId?.trim();
        if (!laneDept) continue;
        const list = out.filter((n) => {
          const d = n.departamento?.trim();
          if (!d) return false;
          return d === laneDept || n.calleId === item.calle.id;
        });
        list.sort(
          (a, b) => a.y - b.y || a.x - b.x || a.id.localeCompare(b.id),
        );
        let y = IA_LANE_Y0;
        const cx = item.x0 + item.w / 2;
        for (const n of list) {
          const cur = byId.get(n.id);
          if (!cur) continue;
          cur.x = cx;
          cur.y = y;
          y += IA_LANE_GAP;
        }
      }

      const placedYs = out
        .filter((n) => n.tipo !== 'START')
        .map((n) => n.y);
      const avgY =
        placedYs.length > 0
          ? placedYs.reduce((a, b) => a + b, 0) / placedYs.length
          : IA_LANE_Y0;

      for (const n of out) {
        if (n.tipo === 'START') {
          n.x = 50;
          n.y = avgY;
        }
      }

      const endX = vl.rightX + 100;
      for (const n of out) {
        if (n.tipo !== 'END') continue;
        const incoming = aristas.find((a) => a.haciaNodoId === n.id);
        const src = incoming ? byId.get(incoming.desdeNodoId) : undefined;
        n.x = endX;
        n.y = src?.y ?? avgY;
      }

      for (const n of out) {
        if (n.tipo !== 'DECISION') continue;
        const neighborIds = new Set<string>();
        for (const a of aristas) {
          if (a.desdeNodoId === n.id) neighborIds.add(a.haciaNodoId);
          if (a.haciaNodoId === n.id) neighborIds.add(a.desdeNodoId);
        }
        const neighbors = [...neighborIds]
          .map((id) => byId.get(id))
          .filter((x): x is NodoCanvas => !!x);
        if (!neighbors.length) continue;
        const xs: number[] = [];
        for (const nb of neighbors) {
          const it = findVerticalItem(nb, vl);
          xs.push(it ? it.x0 + it.w / 2 : nb.x);
        }
        n.x = (Math.min(...xs) + Math.max(...xs)) / 2;
        n.y = neighbors.reduce((s, nb) => s + nb.y, 0) / neighbors.length;
      }

      return out;
    }

    const hl = this.swimHorizontalLayout();
    if (!hl?.items.length) return nodos;
    const centerX = SWIM_ORIGIN_X + SWIM_LABEL_H + SWIM_HORIZ_CONTENT_W / 2;
    const horizOut = nodos.map((n) => ({ ...n }));
    const horizById = new Map(horizOut.map((n) => [n.id, n]));
    for (const item of hl.items) {
      const laneDept = item.calle.departamentoId?.trim();
      if (!laneDept) continue;
      const list = horizOut.filter((n) => {
        const d = n.departamento?.trim();
        if (!d) return false;
        return d === laneDept || n.calleId === item.calle.id;
      });
      list.sort(
        (a, b) => a.y - b.y || a.x - b.x || a.id.localeCompare(b.id),
      );
      let y = IA_LANE_Y0;
      for (const n of list) {
        const cur = horizById.get(n.id);
        if (!cur) continue;
        cur.x = centerX;
        cur.y = y;
        y += IA_LANE_GAP;
      }
    }
    const hPlacedYs = horizOut
      .filter((n) => n.tipo !== 'START')
      .map((n) => n.y);
    const hAvgY =
      hPlacedYs.length > 0
        ? hPlacedYs.reduce((a, b) => a + b, 0) / hPlacedYs.length
        : IA_LANE_Y0;
    for (const n of horizOut) {
      if (n.tipo === 'START') {
        n.x = 50;
        n.y = hAvgY;
      }
    }
    const endXH = SWIM_ORIGIN_X + SWIM_LABEL_H + SWIM_HORIZ_CONTENT_W + 100;
    for (const n of horizOut) {
      if (n.tipo !== 'END') continue;
      const incoming = aristas.find((a) => a.haciaNodoId === n.id);
      const src = incoming ? horizById.get(incoming.desdeNodoId) : undefined;
      n.x = endXH;
      n.y = src?.y ?? hAvgY;
    }
    for (const n of horizOut) {
      if (n.tipo !== 'DECISION') continue;
      const neighborIds = new Set<string>();
      for (const a of aristas) {
        if (a.desdeNodoId === n.id) neighborIds.add(a.haciaNodoId);
        if (a.haciaNodoId === n.id) neighborIds.add(a.desdeNodoId);
      }
      const neighbors = [...neighborIds]
        .map((id) => horizById.get(id))
        .filter((x): x is NodoCanvas => !!x);
      if (!neighbors.length) continue;
      n.x = neighbors.reduce((s, nb) => s + nb.x, 0) / neighbors.length;
      n.y = neighbors.reduce((s, nb) => s + nb.y, 0) / neighbors.length;
    }
    return horizOut;
  }

  private hidratarPolitica(idRuta: string, p: Politica): void {
    this.historialPasado = [];
    this.historialFuturo = [];
    this.politicaId = p?.id ? p.id : idRuta || null;
    this.politicaRutaId.set(this.politicaId);
    this.politicaBase = p?.id ? p : null;
    this.nombrePolitica.set(p?.nombre?.trim() ? p.nombre : 'Nueva política');
    const callesDiseno = (p?.callesDiseno ?? []).map((c) => ({ ...c }));
    this.calles.set(callesDiseno);
    this.orientacionCalles.set(
      normalizeOrientacionCalles(p?.orientacionCalles as string | undefined),
    );
    this.flashCalleId.set(null);
    this.resaltarCalleId.set(null);
    if (p?.nodos?.length) {
      let nodosCanvas = p.nodos.map(mapNodoToCanvas);
      if (callesDiseno.length > 0) {
        nodosCanvas = nodosCanvas.map((n) => {
          if (n.tipo !== 'ACTIVIDAD' || !n.departamento || n.calleId) return n;
          const cal = callesDiseno.find((c) => c.departamentoId === n.departamento);
          return cal ? { ...n, calleId: cal.id } : n;
        });
      }
      this.nodos.set(nodosCanvas);
      this.aristas.set((p.aristas ?? []).map((a) => ({ ...a })));
    } else {
      this.nodos.set([
        {
          id: `nd-${uuid()}`,
          tipo: 'START',
          etiqueta: 'Inicio',
          x: 480,
          y: 280,
        },
      ]);
      this.aristas.set([]);
    }
    this.zoom.set(1);
    this.panX.set(0);
    this.panY.set(0);
    this.seleccionId.set(null);
    this.conexionDesde.set(null);
    this.syncHistorialFlags();
  }

  private centroVisibleMundo(): { x: number; y: number } {
    const svg = this.viewportRef()?.nativeElement.closest('svg');
    if (!svg) return { x: 520, y: 320 };
    const g = this.viewportRef()?.nativeElement;
    if (!g) return { x: 520, y: 320 };
    const r = svg.getBoundingClientRect();
    const pt = svg.createSVGPoint();
    pt.x = r.left + r.width / 2;
    pt.y = r.top + r.height / 2;
    const ctm = g.getScreenCTM();
    if (!ctm) return { x: 520, y: 320 };
    const inv = ctm.inverse();
    const p = pt.matrixTransform(inv);
    return { x: p.x, y: p.y };
  }

  private capturarSnapshot() {
    return snapshotFrom(
      this.nombrePolitica(),
      this.nodos(),
      this.aristas(),
      this.zoom(),
      this.panX(),
      this.panY(),
      this.calles(),
      this.orientacionCalles(),
    );
  }

  private pushSnapshot(): void {
    const snap = this.capturarSnapshot();
    this.historialPasado.push(snap);
    if (this.historialPasado.length > HIST_MAX) {
      this.historialPasado.shift();
    }
    this.historialFuturo = [];
  }

  private restaurarSnapshot(s: ReturnType<typeof snapshotFrom>): void {
    this.nombrePolitica.set(s.nombrePolitica);
    this.nodos.set(structuredClone(s.nodos));
    this.aristas.set(structuredClone(s.aristas));
    this.calles.set(structuredClone(s.calles));
    this.orientacionCalles.set(
      normalizeOrientacionCalles(s.orientacionCalles as string),
    );
    this.zoom.set(s.zoom);
    this.panX.set(s.panX);
    this.panY.set(s.panY);
    this.seleccionId.set(null);
    this.aristaSeleccionId.set(null);
    this.conexionDesde.set(null);
    this.flashCalleId.set(null);
    this.resaltarCalleId.set(null);
  }

  private syncHistorialFlags(): void {
    this.puedeDeshacer.set(this.historialPasado.length > 0);
    this.puedeRehacer.set(this.historialFuturo.length > 0);
  }
}

function etiquetaDefault(tipo: NodoCanvasTipo): string {
  switch (tipo) {
    case 'START':
      return 'Inicio';
    case 'END':
      return 'Fin';
    case 'ACTIVIDAD':
      return 'Actividad';
    case 'DECISION':
      return '¿Decisión?';
    case 'FORK_BAR':
      return 'Paralelo';
    case 'JOIN_BAR':
      return 'Unir';
    default:
      return 'Nodo';
  }
}

export { buildValidation } from './policy-designer-validation';
export type { ValidacionFlujoResultado } from './policy-designer-validation';
