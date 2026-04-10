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
import { MatTabsModule } from '@angular/material/tabs';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { map, switchMap, take } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import type { Arista, Nodo, OrientacionCalles, Politica } from '../../../core/models/politica.model';
import {
  normalizeNodoTipo,
  normalizeOrientacionCalles,
} from '../../../core/models/politica.model';
import type { Departamento } from '../../../core/models/departamento.model';
import { DepartamentoService } from '../../../core/services/departamento.service';
import { PoliticaService } from '../../../core/services/politica.service';
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
  pathBezierEntreNodos,
  puertoLocal,
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
  type ValidacionFlujoResultado,
} from './policy-designer-validation';
import { ValidationResultDialogComponent } from './validation-result-dialog.component';

const ZOOM_MIN = 0.3;
const ZOOM_MAX = 2;
const HIST_MAX = 50;

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
    slaHoras: undefined,
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
  };
}

type WizardFlujo = 'directo' | 'paralelo' | 'existente' | 'fin';
type WizardNoModo = 'actividad' | 'fin' | 'bucle';

type RecVoz = {
  lang: string;
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
    MatTabsModule,
    MatRadioModule,
    MatCheckboxModule,
    MatButtonToggleModule,
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
  private readonly snack = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  readonly viewportRef = viewChild<ElementRef<SVGGElement>>('viewportG');

  readonly nombrePolitica = signal('Nueva política');
  readonly nodos = signal<NodoCanvas[]>([]);
  readonly aristas = signal<AristaCanvas[]>([]);
  readonly calles = signal<CalleCanvas[]>([]);
  readonly orientacionCalles = signal<OrientacionCalles>('VERTICAL');
  readonly flashCalleId = signal<string | null>(null);
  readonly resaltarCalleId = signal<string | null>(null);
  readonly departamentosLista = signal<Departamento[]>([]);
  private resaltarTimer: number | null = null;

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
  /** Origen de conexión: nodo + puerto 'out' */
  readonly conexionDesde = signal<{
    nodoId: string;
    puerto: 'out';
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

  readonly tieneStart = computed(() =>
    this.nodos().some((n) => n.tipo === 'START'),
  );

  readonly transformViewport = computed(
    () =>
      `translate(${this.panX()}, ${this.panY()}) scale(${this.zoom()})`,
  );

  readonly puedeDeshacer = signal(false);
  readonly puedeRehacer = signal(false);

  readonly tabPanelDerecho = signal(0);
  /** Subvista dentro de la pestaña Asistente: wizard o chat IA */
  readonly asistenteSub = signal<'wizard' | 'ia'>('wizard');

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

  readonly chatMensajes = signal<{ rol: 'usuario' | 'asistente'; texto: string }[]>(
    [],
  );
  readonly chatBorrador = signal('');
  private reconocimiento: { stop: () => void } | null = null;
  readonly escuchandoVoz = signal(false);

  readonly actividadesParaEnlace = computed(() => {
    const origenId = this.seleccionId();
    return this.nodos().filter(
      (n) => n.tipo === 'ACTIVIDAD' && n.id !== origenId,
    );
  });

  readonly tiposPaleta: { tipo: NodoCanvasTipo; label: string }[] = [
    { tipo: 'START', label: 'START' },
    { tipo: 'END', label: 'END' },
    { tipo: 'ACTIVIDAD', label: 'Actividad' },
    { tipo: 'DECISION', label: 'Decisión' },
    { tipo: 'FORK_BAR', label: 'Fork' },
    { tipo: 'JOIN_BAR', label: 'Join' },
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
      untracked(() => this.reiniciarWizardFormulario());
    });

    this.destroyRef.onDestroy(() => {
      this.detenerReconocimientoVoz();
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
      .subscribe((d) => this.departamentosLista.set(d));
  }

  private nombreDepartamento(depId: string | undefined): string | undefined {
    if (!depId) return undefined;
    return this.departamentosLista().find((x) => x.id === depId)?.nombre;
  }

  puertoLocal = puertoLocal;

  pathArista(ar: AristaCanvas): string {
    const map = new Map(this.nodos().map((n) => [n.id, n]));
    const a = map.get(ar.desdeNodoId);
    const b = map.get(ar.haciaNodoId);
    if (!a || !b) return '';
    return pathBezierEntreNodos(a, b);
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
    this.seleccionId.set(n.id);
    this.conexionDesde.set(null);
  }

  holderMinWidthStyle(): string | null {
    if (!this.calles().length) return null;
    if (this.orientacionCalles() === 'VERTICAL') {
      const vl = this.swimVerticalLayout();
      return vl ? `max(100%, ${vl.rightX + 400}px)` : null;
    }
    const hl = this.swimHorizontalLayout();
    return hl ? `max(100%, ${hl.contentW + 400}px)` : null;
  }

  holderMinHeightStyle(): string | null {
    if (this.orientacionCalles() !== 'HORIZONTAL' || !this.calles().length) {
      return null;
    }
    const hl = this.swimHorizontalLayout();
    return hl ? `max(100%, ${hl.bottomY + 400}px)` : null;
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
  ): void {
    ev.stopPropagation();
    ev.preventDefault();
    const origen = this.conexionDesde();

    if (puerto === 'out') {
      this.conexionDesde.set({ nodoId: n.id, puerto: 'out' });
      return;
    }

    if (puerto === 'in' && origen) {
      if (origen.nodoId === n.id) {
        this.conexionDesde.set(null);
        return;
      }
      const existe = this.aristas().some(
        (a) =>
          a.desdeNodoId === origen.nodoId && a.haciaNodoId === n.id,
      );
      if (existe) {
        this.snack.open('Esa conexión ya existe', 'Cerrar', { duration: 2000 });
        this.conexionDesde.set(null);
        return;
      }
      this.pushSnapshot();
      const nueva: AristaCanvas = {
        id: `ar-${uuid()}`,
        desdeNodoId: origen.nodoId,
        haciaNodoId: n.id,
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
    }
  }

  clickCanvas(ev: MouseEvent): void {
    if ((ev.target as Element).closest('.pd-node-root')) return;
    this.seleccionId.set(null);
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
      arr.map((n) => (n.id === id ? { ...n, slaHoras: sla } : n)),
    );
  }

  modoConexion(): boolean {
    return this.conexionDesde() != null;
  }

  puertoOrigenActivo(n: NodoCanvas): boolean {
    const o = this.conexionDesde();
    return o != null && o.nodoId === n.id;
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
    this.syncHistorialFlags();
  }

  tipoLabel(t: NodoCanvasTipo): string {
    return t;
  }

  onTabDerechoChange(index: number): void {
    this.tabPanelDerecho.set(index);
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
        flujo === 'directo' || flujo === 'fin'
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
    const pushA = (desde: string, hacia: string, etiqueta?: string) => {
      aristas = [
        ...aristas,
        { id: `ar-${uuid()}`, desdeNodoId: desde, haciaNodoId: hacia, etiqueta },
      ];
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
      const deptoFinId = this.wizardDeptoActividad();
      const a = crearNodoVacio(
        'ACTIVIDAD',
        p.x,
        p.y,
        this.wizardNombreActividad().trim(),
        `nd-${uuid()}`,
        deptoFinId,
        this.nombreDepartamento(deptoFinId),
      );
      pushN(a);
      pushA(origen.id, a.id);
      const r = this.obtenerOCrearFin(nodos, a);
      nodos = r.nodos;
      let end = r.end;
      if (r.esNuevo) {
        const pe = posicionFinDesde(a, nodos.filter((x) => x.id !== end.id));
        end = { ...end, x: pe.x, y: pe.y };
        nodos = nodos.map((x) => (x.id === end.id ? end : x));
      }
      pushA(a.id, end.id);
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
      pushA(fork.id, act.id);
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
    for (const id of actIds) {
      pushA(id, join.id);
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
    const pushA = (desde: string, hacia: string, etiqueta?: string) => {
      aristas = [
        ...aristas,
        { id: `ar-${uuid()}`, desdeNodoId: desde, haciaNodoId: hacia, etiqueta },
      ];
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
    pushA(origen.id, dec.id);

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

  chatEnviar(): void {
    const t = this.chatBorrador().trim();
    if (!t) return;
    this.chatMensajes.update((m) => [...m, { rol: 'usuario', texto: t }]);
    this.chatBorrador.set('');
    this.chatMensajes.update((m) => [
      ...m,
      {
        rol: 'asistente',
        texto: `Procesando: ${t}...`,
      },
    ]);
  }

  alternarMicrofono(): void {
    if (this.escuchandoVoz()) {
      this.detenerReconocimientoVoz();
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
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onresult = (ev) => {
        const tx = ev.results[0]?.[0]?.transcript?.trim() ?? '';
        if (tx) {
          this.chatBorrador.update((b) => (b ? `${b} ${tx}` : tx));
        }
        this.detenerReconocimientoVoz();
      };
      rec.onerror = () => this.detenerReconocimientoVoz();
      rec.onend = () => this.escuchandoVoz.set(false);
      this.reconocimiento = rec;
      this.escuchandoVoz.set(true);
      rec.start();
    } catch {
      this.snack.open('No se pudo iniciar el micrófono', 'Cerrar', {
        duration: 3000,
      });
      this.escuchandoVoz.set(false);
    }
  }

  private detenerReconocimientoVoz(): void {
    try {
      this.reconocimiento?.stop();
    } catch {
      /* ignore */
    }
    this.reconocimiento = null;
    this.escuchandoVoz.set(false);
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
