import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
  ElementRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DragDropModule, CdkDragEnd } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { map, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import type { Arista, Nodo, Politica } from '../../../core/models/politica.model';
import { DepartamentoService } from '../../../core/services/departamento.service';
import { PoliticaService } from '../../../core/services/politica.service';
import type { AristaCanvas, NodoCanvas, NodoCanvasTipo } from './policy-designer.models';
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

const ZOOM_MIN = 0.3;
const ZOOM_MAX = 2;
const HIST_MAX = 50;

function uuid(): string {
  return globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random()}`;
}

function mapNodoToCanvas(n: Nodo): NodoCanvas {
  return {
    id: n.id,
    tipo: n.tipo,
    etiqueta: n.etiqueta,
    x: n.posicionX,
    y: n.posicionY,
    departamento: n.departamentoId,
    slaHoras: undefined,
  };
}

function mapCanvasToNodo(n: NodoCanvas): Nodo {
  return {
    id: n.id,
    tipo: n.tipo,
    etiqueta: n.etiqueta,
    posicionX: Math.round(n.x),
    posicionY: Math.round(n.y),
    departamentoId: n.departamento,
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
    AsyncPipe,
    MatToolbarModule,
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
export class PolicyDesignerComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly politicaService = inject(PoliticaService);
  private readonly departamentoService = inject(DepartamentoService);
  private readonly snack = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly viewportRef = viewChild<ElementRef<SVGGElement>>('viewportG');

  readonly nombrePolitica = signal('Nueva política');
  readonly nodos = signal<NodoCanvas[]>([]);
  readonly aristas = signal<AristaCanvas[]>([]);
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

  private historialPasado: ReturnType<typeof snapshotFrom>[] = [];
  private historialFuturo: ReturnType<typeof snapshotFrom>[] = [];

  private panArrastre: {
    sx: number;
    sy: number;
    ox: number;
    oy: number;
  } | null = null;

  private panPrevia: { x: number; y: number } | null = null;


  readonly departamentos$ = this.departamentoService.getDepartamentos();

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

    this.destroyRef.onDestroy(() => this.detenerReconocimientoVoz());
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
    const n: NodoCanvas = {
      id: `nd-${uuid()}`,
      tipo,
      etiqueta: base,
      x,
      y,
    };
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

  onFondoPointerDown(ev: PointerEvent): void {
    if (ev.button !== 0) return;
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
    const p = this.panArrastre;
    if (!p) return;
    this.panX.set(p.ox + (ev.clientX - p.sx));
    this.panY.set(p.oy + (ev.clientY - p.sy));
  }

  @HostListener('document:pointerup')
  onDocPointerUp(): void {
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
    this.pushSnapshot();
    this.nodos.update((arr) =>
      arr.map((node) =>
        node.id === n.id ? { ...node, x: node.x + dx, y: node.y + dy } : node,
      ),
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
    const base = this.politicaBase ?? ({} as Politica);
    const politica: Politica = {
      ...base,
      id: this.politicaId,
      nombre: this.nombrePolitica(),
      activa: base.activa ?? true,
      nodos: this.nodos().map(mapCanvasToNodo),
      aristas: this.aristas().map((a) => ({ ...a })) as Arista[],
    };
    this.politicaService
      .actualizarPolitica(this.politicaId, politica)
      .subscribe(() => {
        this.snack.open('Política guardada', 'Cerrar', { duration: 2500 });
      });
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
    const nodos = this.nodos();
    const errores: string[] = [];
    if (!nodos.some((n) => n.tipo === 'START')) errores.push('Falta nodo START');
    if (!nodos.some((n) => n.tipo === 'END')) errores.push('Falta nodo END');
    for (const n of nodos) {
      if (n.tipo === 'ACTIVIDAD' && !n.departamento?.trim()) {
        errores.push(`Actividad “${n.etiqueta}” sin departamento`);
      }
    }
    if (errores.length === 0) {
      this.snack.open('Validación OK: no se detectaron problemas básicos', 'Cerrar', {
        duration: 3500,
      });
    } else {
      this.snack.open(errores.slice(0, 3).join(' · '), 'Cerrar', {
        duration: 6000,
      });
    }
  }

  volver(): void {
    void this.router.navigate(['/admin/politicas']);
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

  patchDepartamento(v: string): void {
    const id = this.seleccionId();
    if (!id) return;
    this.nodos.update((arr) =>
      arr.map((n) => (n.id === id ? { ...n, departamento: v || undefined } : n)),
    );
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
      const a = crearNodoVacio(
        'ACTIVIDAD',
        p.x,
        p.y,
        this.wizardNombreActividad().trim(),
        `nd-${uuid()}`,
        this.wizardDeptoActividad(),
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
      const a = crearNodoVacio(
        'ACTIVIDAD',
        p.x,
        p.y,
        this.wizardNombreActividad().trim(),
        `nd-${uuid()}`,
        this.wizardDeptoActividad(),
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
      const act = crearNodoVacio(
        'ACTIVIDAD',
        posActs[i].x,
        posActs[i].y,
        items[i].nombre.trim(),
        `nd-${uuid()}`,
        items[i].depto,
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
      const sa = crearNodoVacio(
        'ACTIVIDAD',
        siPos.x,
        siPos.y,
        this.wizardSiNombre().trim(),
        `nd-${uuid()}`,
        this.wizardSiDepto(),
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
      const na = crearNodoVacio(
        'ACTIVIDAD',
        noPos.x,
        noPos.y,
        this.wizardNoNombre().trim(),
        `nd-${uuid()}`,
        this.wizardNoDepto(),
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
    this.politicaBase = p?.id ? p : null;
    this.nombrePolitica.set(p?.nombre?.trim() ? p.nombre : 'Nueva política');
    if (p?.nodos?.length) {
      this.nodos.set(p.nodos.map(mapNodoToCanvas));
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
    this.zoom.set(s.zoom);
    this.panX.set(s.panX);
    this.panY.set(s.panY);
    this.seleccionId.set(null);
    this.conexionDesde.set(null);
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
