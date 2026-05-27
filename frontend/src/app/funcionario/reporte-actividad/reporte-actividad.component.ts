import { DatePipe, isPlatformBrowser, NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  inject,
  OnDestroy,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
  type ValidatorFn,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import {
  catchError,
  finalize,
  interval,
  map,
  Observable,
  of,
  switchMap,
  take,
  tap,
} from 'rxjs';

import type {
  DocumentoColaborativo,
  SeccionPlantillaDocumentoColaborativo,
  SeccionPlantillaTipo,
} from '../../core/models/doc-colaborativo.model';
import { Informe } from '../../core/models/informe.model';
import type { CampoFormulario, FormularioActividad } from '../../core/models/nodo.model';
import { etiquetaClienteReferencia, Tarea } from '../../core/models/tarea.model';
import { AuthService } from '../../core/services/auth.service';
import {
  DocColaborativoService,
  type CambioSeccionDocumento,
} from '../../core/services/doc-colaborativo.service';
import { FormularioFuncionarioService } from '../../core/services/formulario-funcionario.service';
import { IaService } from '../../core/services/ia.service';
import { InformeService } from '../../core/services/informe.service';
import { TareaService } from '../../core/services/tarea.service';
import { formatoTiempoAbierto } from '../../core/utils/tiempo-abierto.util';
import { DocumentosComponent } from '../../shared/documentos/documentos.component';
import { DecisionRamaDialogComponent } from './decision-rama-dialog.component';

export type ModoEntrada = 'texto' | 'voz';

type TipoCampoReporte =
  | 'texto_corto'
  | 'texto_largo'
  | 'select'
  | 'imagen'
  | 'archivo'
  | 'checkbox'
  | 'fecha';

const TIPOS_SECCION_DOC_COLAB = new Set<SeccionPlantillaTipo>([
  'texto_corto',
  'texto_largo',
  'fecha',
  'checkbox',
  'select',
  'tabla',
]);

const TIPO_API_A_SECCION_DOC_COLAB: Record<string, SeccionPlantillaTipo> = {
  TEXTO_CORTO: 'texto_corto',
  TEXTO_LARGO: 'texto_largo',
  SELECT: 'select',
  CHECKBOX: 'checkbox',
  FECHA: 'fecha',
  TABLA: 'tabla',
};

@Component({
  selector: 'app-reporte-actividad',
  standalone: true,
  imports: [
    DatePipe,
    NgClass,
    ReactiveFormsModule,
    MatToolbarModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,
    MatTabsModule,
    DocumentosComponent,
  ],
  templateUrl: './reporte-actividad.component.html',
  styleUrl: './reporte-actividad.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReporteActividadComponent implements OnDestroy {
  readonly formatoTiempoAbierto = formatoTiempoAbierto;

  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tareaService = inject(TareaService);
  private readonly formularioFuncionarioService = inject(FormularioFuncionarioService);
  private readonly iaService = inject(IaService);
  private readonly informeService = inject(InformeService);
  private readonly docColabService = inject(DocColaborativoService);
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly cargando = signal(true);
  readonly tarea = signal<Tarea | null>(null);
  readonly informe = signal<Informe | null>(null);
  readonly definicionFormulario = signal<FormularioActividad | null>(null);

  readonly camposFormularioOrdenados = computed(() =>
    [...(this.definicionFormulario()?.campos ?? [])].sort((a, b) => a.orden - b.orden),
  );

  readonly usarFormularioDinamico = computed(() => {
    if (this.tarea()?.estado === 'completado') return false;
    return this.camposFormularioOrdenados().length > 0;
  });

  /** Incluye tareas completadas con definición cargada (solo lectura dinámica). */
  readonly vistaCamposDinamicos = computed(
    () => this.camposFormularioOrdenados().length > 0,
  );

  readonly docColabHabilitado = computed(
    () => this.definicionFormulario()?.habilitadoDocumentoColaborativo ?? false,
  );

  readonly docColabEditable = computed(
    () => this.tarea()?.estado === 'en_atencion',
  );

  readonly tituloDocColaborativo = computed(
    () =>
      this.definicionFormulario()?.tituloDocumentoColaborativo?.trim() ||
      'Documento colaborativo',
  );

  readonly seccionesPlantillaDocColab = computed(() =>
    (this.definicionFormulario()?.seccionesDocumentoColaborativo ?? []).map((s) =>
      this.normalizeSeccionPlantilla(s),
    ),
  );

  readonly permisoNodoActual = computed(() => {
    const t = this.tarea();
    if (!t) return 'ACCESO_COMPLETO';

    const anyT = t as unknown as Record<string, unknown>;
    const nodo =
      (anyT['nodoActual'] as Record<string, unknown> | undefined) ??
      (anyT['nodo'] as Record<string, unknown> | undefined);

    const permiso =
      (nodo?.['permisoDocumentos'] as string | undefined) ??
      (anyT['permisoDocumentos'] as string | undefined);

    return (permiso ?? '').trim() || 'ACCESO_COMPLETO';
  });

  readonly modo = signal<ModoEntrada>('texto');
  readonly grabando = signal(false);
  readonly lineaVoz = signal('');
  readonly speechDisponible = signal(false);
  readonly enviando = signal(false);
  readonly docColabCargando = signal(false);
  readonly docColabGuardando = signal(false);
  readonly edicionPorSeccion = signal<Record<string, string>>({});

  private docColabDirty = false;
  private aplicandoCambioRemotoDocColab = false;
  private docColabTramiteId: string | null = null;
  private docColabNodoId: string | null = null;
  private readonly edicionTimers = new Map<string, ReturnType<typeof setTimeout>>();

  private acumuladoFinal = '';
  /** Web Speech API — tipado laxo (webkit / prefijos) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private recognition: any = null;

  /** Controles variables: fallback fijo o campos `f_*` del formulario dinámico. */
  readonly form = this.fb.group({});

  /** Valores por sección del documento colaborativo (`dc_*`). */
  readonly docColabForm = this.fb.group({});

  constructor() {
    type Carga = {
      tarea: Tarea | null;
      informe: Informe | null;
      definicion: FormularioActividad | null;
    };
    const vacio: Carga = { tarea: null, informe: null, definicion: null };

    this.route.paramMap
      .pipe(
        tap(() => {
          this.cargando.set(true);
          this.informe.set(null);
          this.definicionFormulario.set(null);
          this.teardownDocColaborativo();
        }),
        takeUntilDestroyed(this.destroyRef),
        switchMap((pm) => {
          const id = pm.get('id');
          if (!id) {
            return of(vacio);
          }
          return this.tareaService.getTareaById(id).pipe(
            switchMap((t) => {
              if (!t) {
                return of(vacio);
              }
              if (t.estado === 'completado') {
                return this.informeService.getInformePorTarea(id).pipe(
                  switchMap((informe) => {
                    const pid = (t.politicaId ?? '').trim();
                    const nid = (t.nodoFlujoId ?? '').trim();
                    if (!pid || !nid) {
                      return of({
                        tarea: t,
                        informe,
                        definicion: null as FormularioActividad | null,
                      });
                    }
                    return this.formularioFuncionarioService.obtener(pid, nid).pipe(
                      map((definicion) => ({
                        tarea: t,
                        informe,
                        definicion,
                      })),
                    );
                  }),
                );
              }
              const pid = (t.politicaId ?? '').trim();
              const nid = (t.nodoFlujoId ?? '').trim();

              if (!pid || !nid) {
                return of({ tarea: t, informe: null, definicion: null });
              }
              return this.formularioFuncionarioService.obtener(pid, nid).pipe(
                map((definicion) => ({
                  tarea: t,
                  informe: null as Informe | null,
                  definicion,
                })),
              );
            }),
            catchError(() => of(vacio)),
          );
        }),
      )
      .subscribe({
        next: ({ tarea, informe, definicion }) => {
          this.cargando.set(false);
          if (!tarea) {
            void this.router.navigate(['/funcionario/bandeja']);
            return;
          }
          this.tarea.set(tarea);
          this.informe.set(informe);
          this.definicionFormulario.set(definicion);
          this.rebuildForm(tarea, informe);
          this.initDocColaborativoSiAplica(tarea);
          this.cdr.markForCheck();
        },
        error: () => {
          this.cargando.set(false);
          void this.router.navigate(['/funcionario/bandeja']);
        },
      });

    if (isPlatformBrowser(this.platformId)) {
      const w = window as Window & {
        SpeechRecognition?: new () => unknown;
        webkitSpeechRecognition?: new () => unknown;
      };
      const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
      this.speechDisponible.set(Boolean(SR));
    }

    this.docColabService.cambios$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((c) => this.onDocColabCambioRemoto(c));

    interval(3000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.autoGuardarDocColaborativo());
  }

  ngOnDestroy(): void {
    this.detenerReconocimiento();
    this.teardownDocColaborativo();
  }

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

  private camposPayloadParaIa(): { id: string; etiqueta: string; tipo: string }[] {
    if (this.usarFormularioDinamico()) {
      return this.camposFormularioOrdenados().map((c) => ({
        id: this.campoControlKey(c),
        etiqueta: (c.etiqueta ?? '').trim(),
        tipo: this.normalizeTipoCampo(c.tipo),
      }));
    }
    return [
      {
        id: 'descripcion',
        etiqueta: 'Descripción de la actividad',
        tipo: 'texto_largo',
      },
      { id: 'observaciones', etiqueta: 'Observaciones', tipo: 'texto_largo' },
    ];
  }

  private aplicarVerbatimPrimeraDescripcion(texto: string): void {
    const key = this.primerCampoVozDescripcionKey();
    if (key) {
      this.form.patchValue({ [key]: texto } as Record<string, string>);
    }
  }

  private aplicarValoresDesdeIa(valores: { id: string; valor: string }[]): void {
    for (const { id, valor } of valores) {
      const ctrl = this.form.get(id);
      if (!ctrl || ctrl.disabled) {
        continue;
      }
      const v = valor ?? '';
      const cur = ctrl.value;
      if (typeof cur === 'boolean') {
        const s = v.trim().toLowerCase();
        ctrl.setValue(
          !s
            ? false
            : ['true', 'sí', 'si', '1', 'yes', 's', 'ok', 'verdadero'].includes(s),
        );
      } else {
        ctrl.setValue(v);
      }
    }
    this.cdr.markForCheck();
  }

  private normalizarEtiquetaClave(s: string): string {
    return s.trim().toLowerCase();
  }

  private parseLineasEtiquetaValor(descripcion: string): Map<string, string> {
    const map = new Map<string, string>();
    for (const line of descripcion.split('\n')) {
      const t = line.trim();
      if (!t) continue;
      const idx = t.indexOf(':');
      if (idx <= 0) continue;
      const lab = t.slice(0, idx).trim();
      const val = t.slice(idx + 1).trim();
      map.set(this.normalizarEtiquetaClave(lab), val);
    }
    return map;
  }

  private parseCheckboxValorDesdeInforme(s: string): boolean {
    const x = s.trim().toLowerCase();
    if (!x) return false;
    if (['no', 'false', '0', 'n'].includes(x)) return false;
    return ['sí', 'si', 'true', '1', 'yes', 's', 'ok', 'verdadero'].includes(x);
  }

  private patchValoresDesdeInformeCompletado(
    informe: Informe,
    campos: CampoFormulario[],
  ): Record<string, string | boolean> {
    const out: Record<string, string | boolean> = {};
    const lineMap = this.parseLineasEtiquetaValor(informe.descripcion ?? '');
    for (const c of campos) {
      const key = this.campoControlKey(c);
      const tipo = this.normalizeTipoCampo(c.tipo);
      const lab = (c.etiqueta ?? '').trim();
      if (tipo === 'imagen' || tipo === 'archivo') {
        continue;
      }
      if (lab.toLowerCase().includes('observacion') && informe.observaciones?.trim()) {
        out[key] = informe.observaciones.trim();
        continue;
      }
      const val = lineMap.get(this.normalizarEtiquetaClave(lab));
      if (val !== undefined) {
        out[key] = tipo === 'checkbox' ? this.parseCheckboxValorDesdeInforme(val) : val;
      }
    }
    return out;
  }

  private rebuildForm(t: Tarea, informe: Informe | null): void {
    for (const k of Object.keys(this.form.controls)) {
      this.form.removeControl(k, { emitEvent: false });
    }

    if (t.estado === 'completado') {
      const camposOrdenados = [...(this.definicionFormulario()?.campos ?? [])].sort(
        (a, b) => a.orden - b.orden,
      );
      if (camposOrdenados.length > 0) {
        for (const c of camposOrdenados) {
          this.form.addControl(this.campoControlKey(c), this.buildControlForCampo(c));
        }
        this.form.enable({ emitEvent: false });
        if (informe) {
          const patch = this.patchValoresDesdeInformeCompletado(informe, camposOrdenados);
          this.form.patchValue(patch as Record<string, unknown>, { emitEvent: false });
        }
        queueMicrotask(() => {
          this.form.disable({ emitEvent: false });
          this.cdr.detectChanges();
        });
        return;
      }

      this.form.addControl('descripcion', this.fb.control(''));
      this.form.addControl('observaciones', this.fb.control(''));
      this.form.enable({ emitEvent: false });
      if (informe) {
        this.form.patchValue(
          {
            descripcion: informe.descripcion ?? '',
            observaciones: informe.observaciones ?? '',
          },
          { emitEvent: false },
        );
        queueMicrotask(() => {
          this.form.disable({ emitEvent: false });
          this.cdr.detectChanges();
        });
      } else {
        queueMicrotask(() => {
          this.form.disable({ emitEvent: false });
          this.cdr.detectChanges();
        });
      }
      return;
    }

    const campos = [...(this.definicionFormulario()?.campos ?? [])].sort(
      (a, b) => a.orden - b.orden,
    );
    if (campos.length > 0) {
      for (const c of campos) {
        this.form.addControl(this.campoControlKey(c), this.buildControlForCampo(c));
      }
      this.form.enable({ emitEvent: false });
      this.form.markAsUntouched({ emitEvent: false });
      this.form.markAsPristine({ emitEvent: false });
      return;
    }

    this.form.addControl(
      'descripcion',
      this.fb.nonNullable.control('', [Validators.required, Validators.minLength(3)]),
    );
    this.form.addControl('observaciones', this.fb.nonNullable.control(''));
    this.form.enable({ emitEvent: false });
    this.form.markAsUntouched({ emitEvent: false });
    this.form.markAsPristine({ emitEvent: false });
  }

  private buildControlForCampo(c: CampoFormulario): FormControl {
    const tipo = this.normalizeTipoCampo(c.tipo);
    const vals: ValidatorFn[] = [];
    if (c.obligatorio) {
      if (tipo === 'checkbox') {
        vals.push(Validators.requiredTrue);
      } else if (tipo !== 'imagen' && tipo !== 'archivo') {
        vals.push(Validators.required);
      }
    }
    if (tipo === 'texto_largo' && c.obligatorio) {
      vals.push(Validators.minLength(3));
    }

    if (tipo === 'checkbox') {
      return this.fb.nonNullable.control(false, vals);
    }
    if (tipo === 'select') {
      const opts = this.opcionesCampoSelect(c);
      const def = opts[0] ?? '';
      return this.fb.nonNullable.control(def, vals);
    }
    if (tipo === 'imagen' || tipo === 'archivo') {
      return this.fb.control({ value: '', disabled: true }, { validators: [] });
    }
    return this.fb.nonNullable.control('', vals);
  }

  private valorCampoComoTexto(c: CampoFormulario, v: unknown): string {
    const tipo = this.normalizeTipoCampo(c.tipo);
    if (tipo === 'checkbox') {
      return v === true ? 'Sí' : 'No';
    }
    if (v == null) {
      return '';
    }
    return String(v).trim();
  }

  private buildDescripcionDesdeCamposDinamicos(): string {
    const lines: string[] = [];
    for (const c of this.camposFormularioOrdenados()) {
      const tipo = this.normalizeTipoCampo(c.tipo);
      if (tipo === 'imagen' || tipo === 'archivo') {
        continue;
      }
      const key = this.campoControlKey(c);
      const v = this.form.get(key)?.value;
      const texto = this.valorCampoComoTexto(c, v);
      if (texto) {
        lines.push(`${c.etiqueta}: ${texto}`);
      }
    }
    return lines.join('\n').trim();
  }

  private valorObservacionesDinamicas(): string | undefined {
    for (const c of this.camposFormularioOrdenados()) {
      if (!(c.etiqueta ?? '').toLowerCase().includes('observacion')) {
        continue;
      }
      const v = this.form.get(this.campoControlKey(c))?.value;
      const s = this.valorCampoComoTexto(c, v);
      return s || undefined;
    }
    return undefined;
  }

  private construirInformeDesdeForm(esBorrador: boolean): Informe | null {
    const t = this.tarea();
    const uid = this.auth.getUsuario().id;
    if (!t?.tramiteId || !uid) {
      return null;
    }
    if (this.usarFormularioDinamico()) {
      const descripcion = this.buildDescripcionDesdeCamposDinamicos();
      const observaciones = this.valorObservacionesDinamicas();
      return {
        tramiteId: t.tramiteId,
        tareaId: esBorrador ? undefined : t.id,
        nodoActividadId: t.nodoFlujoId ?? undefined,
        funcionarioId: uid,
        descripcion:
          esBorrador && !descripcion.trim() ? '(borrador)' : descripcion.trim() || '(sin datos)',
        resultado: 'Completado',
        observaciones,
        archivos: [],
        esBorrador,
        creadoEn: new Date(),
        enviadoEn: esBorrador ? undefined : new Date(),
      };
    }
    const raw = this.form.getRawValue() as {
      descripcion: string;
      observaciones?: string;
    };
    return {
      tramiteId: t.tramiteId,
      tareaId: esBorrador ? undefined : t.id,
      nodoActividadId: t.nodoFlujoId ?? undefined,
      funcionarioId: uid,
      descripcion:
        (raw.descripcion?.trim() || (esBorrador ? '(borrador)' : '')) ?? '',
      resultado: 'Completado',
      observaciones: raw.observaciones?.trim() || undefined,
      archivos: [],
      esBorrador,
      creadoEn: new Date(),
      enviadoEn: esBorrador ? undefined : new Date(),
    };
  }

  private primerCampoVozDescripcionKey(): string | null {
    if (!this.usarFormularioDinamico()) {
      return 'descripcion';
    }
    for (const c of this.camposFormularioOrdenados()) {
      if (this.normalizeTipoCampo(c.tipo) === 'texto_largo') {
        return this.campoControlKey(c);
      }
    }
    for (const c of this.camposFormularioOrdenados()) {
      if (this.normalizeTipoCampo(c.tipo) === 'texto_corto') {
        return this.campoControlKey(c);
      }
    }
    return null;
  }

  nombreEditandoSeccion(seccionId: string): string | null {
    return this.edicionPorSeccion()[seccionId] ?? null;
  }

  docColabControlKey(seccionId: string): string {
    const id = seccionId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `dc_${id}`;
  }

  onDocColabSeccionChange(seccionId: string): void {
    if (this.aplicandoCambioRemotoDocColab || !this.docColabEditable()) {
      return;
    }
    const contenido = this.contenidoSeccionDocColabPorId(seccionId);
    this.docColabService.enviarCambioSeccion(seccionId, contenido);
    this.docColabDirty = true;
  }

  volverBandeja(): void {
    void this.router.navigate(['/funcionario/bandeja']);
  }

  setModo(m: ModoEntrada): void {
    this.modo.set(m);
    if (m === 'texto') {
      this.detenerReconocimiento();
    }
  }

  toggleMic(): void {
    if (this.grabando()) {
      this.detenerGrabacion();
    } else {
      this.iniciarGrabacion();
    }
  }

  iniciarGrabacion(): void {
    if (!isPlatformBrowser(this.platformId) || !this.speechDisponible()) return;

    const w = window as Window & {
      SpeechRecognition?: new () => unknown;
      webkitSpeechRecognition?: new () => unknown;
    };
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) return;

    this.detenerReconocimiento();
    this.acumuladoFinal = '';
    this.lineaVoz.set('');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = new SR() as any;
    this.recognition = r;
    r.lang = 'es-ES';
    r.continuous = true;
    r.interimResults = true;

    r.onresult = (ev: {
      resultIndex: number;
      results: Array<{ isFinal: boolean; 0: { transcript: string } }>;
    }) => {
      let interim = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const res = ev.results[i];
        const chunk = res[0]?.transcript ?? '';
        if (res.isFinal) {
          this.acumuladoFinal += chunk;
        } else {
          interim += chunk;
        }
      }
      this.lineaVoz.set((this.acumuladoFinal + interim).trim());
    };

    r.onerror = () => {
      this.grabando.set(false);
    };

    r.onend = () => {
      this.grabando.set(false);
      const texto = (this.acumuladoFinal || this.lineaVoz()).trim();
      if (!texto) {
        this.recognition = null;
        return;
      }
      const campos = this.camposPayloadParaIa();
      if (campos.length === 0) {
        this.aplicarVerbatimPrimeraDescripcion(texto);
        this.recognition = null;
        this.cdr.markForCheck();
        return;
      }
      this.iaService
        .rellenarFormulario({ textoVoz: texto, campos })
        .pipe(
          take(1),
          finalize(() => {
            this.recognition = null;
          }),
        )
        .subscribe({
          next: (res) => {
            this.aplicarValoresDesdeIa(res.valores);
          },
          error: () => {
            this.snack.open(
              'No se pudo interpretar la voz con IA. Se dejó la transcripción en el primer campo.',
              'Cerrar',
              { duration: 4800 },
            );
            this.aplicarVerbatimPrimeraDescripcion(texto);
          },
        });
    };

    try {
      r.start();
      this.grabando.set(true);
    } catch {
      this.grabando.set(false);
    }
  }

  detenerGrabacion(): void {
    try {
      this.recognition?.stop();
    } catch {
      /* noop */
    }
  }

  private detenerReconocimiento(): void {
    try {
      this.recognition?.stop();
    } catch {
      /* noop */
    }
    this.recognition = null;
    this.grabando.set(false);
  }

  limpiarVoz(): void {
    this.detenerReconocimiento();
    this.acumuladoFinal = '';
    this.lineaVoz.set('');
    const key = this.primerCampoVozDescripcionKey();
    if (key) {
      this.form.get(key)?.reset('');
    }
  }

  guardarBorrador(): void {
    const informe = this.construirInformeDesdeForm(true);
    if (!informe) {
      return;
    }
    this.informeService.crearInforme(informe).pipe(take(1)).subscribe();
  }

  completarYEnviar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const t = this.tarea();
    const uid = this.auth.getUsuario().id;
    if (!t?.id || !t.tramiteId || !uid) return;

    const informe = this.construirInformeDesdeForm(false);
    if (!informe) {
      return;
    }

    this.enviando.set(true);

    this.informeService
      .crearInforme(informe)
      .pipe(
        switchMap(() => this.tareaService.completarTarea(t.id!)),
        switchMap((tareaResp) => this.flujoPostCompletar$(t.id!, tareaResp)),
        take(1),
      )
      .subscribe({
        next: () => {
          this.enviando.set(false);
          void this.router.navigate(['/funcionario/bandeja']);
        },
        error: () => this.enviando.set(false),
      });
  }

  private flujoPostCompletar$(tareaId: string, resp: Tarea): Observable<unknown> {
    if (!resp.requiereDecision || !resp.opcionesDecision?.length) {
      return of(null);
    }
    return this.dialog
      .open(DecisionRamaDialogComponent, {
        width: '440px',
        maxWidth: '92vw',
        disableClose: true,
        data: {
          condicion: resp.condicionDecision ?? '',
          opciones: resp.opcionesDecision,
        },
      })
      .afterClosed()
      .pipe(
        switchMap((rama: string | undefined) => {
          if (!rama) {
            return of(null);
          }
          return this.tareaService.decidirRama(tareaId, rama);
        }),
      );
  }

  tituloToolbar(): string {
    return this.soloLectura() ? 'Reporte de actividad' : 'Reportar actividad completada';
  }

  soloLectura(): boolean {
    return this.tarea()?.estado === 'completado';
  }

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

  normalizeTipoSeccion(tipo: unknown): SeccionPlantillaTipo {
    const raw = String(tipo ?? 'texto_largo');
    const normalizado =
      TIPO_API_A_SECCION_DOC_COLAB[raw] ?? (raw.toLowerCase() as SeccionPlantillaTipo);
    return TIPOS_SECCION_DOC_COLAB.has(normalizado) ? normalizado : 'texto_largo';
  }

  private normalizeSeccionPlantilla(
    s: SeccionPlantillaDocumentoColaborativo,
  ): SeccionPlantillaDocumentoColaborativo {
    const tipo = this.normalizeTipoSeccion(s.tipo);
    return {
      ...s,
      tipo,
      titulo: s.titulo?.trim() || 'Sección',
      opciones:
        tipo === 'select' && Array.isArray(s.opciones)
          ? s.opciones.map((x) => String(x))
          : tipo === 'select'
            ? []
            : undefined,
    };
  }

  private initDocColaborativoSiAplica(tarea: Tarea): void {
    this.teardownDocColaborativo();
    if (!this.docColabHabilitado()) {
      return;
    }
    const tramiteId = (tarea.tramiteId ?? '').trim();
    const nodoId = (tarea.nodoFlujoId ?? '').trim();
    if (!tramiteId || !nodoId) {
      return;
    }
    this.docColabTramiteId = tramiteId;
    this.docColabNodoId = nodoId;
    this.docColabCargando.set(true);
    this.docColabService.conectar(tramiteId, nodoId);
    this.docColabService.obtener(tramiteId, nodoId).subscribe({
      next: (doc) => {
        this.rebuildDocColabForm(doc);
        this.docColabCargando.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.rebuildDocColabForm(null);
        this.docColabCargando.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  private teardownDocColaborativo(): void {
    this.docColabService.desconectar();
    this.docColabTramiteId = null;
    this.docColabNodoId = null;
    this.docColabDirty = false;
    this.docColabCargando.set(false);
    this.docColabGuardando.set(false);
    this.edicionPorSeccion.set({});
    for (const timer of this.edicionTimers.values()) {
      clearTimeout(timer);
    }
    this.edicionTimers.clear();
    Object.keys(this.docColabForm.controls).forEach((k) => this.docColabForm.removeControl(k));
  }

  private rebuildDocColabForm(doc: DocumentoColaborativo | null): void {
    Object.keys(this.docColabForm.controls).forEach((k) => this.docColabForm.removeControl(k));
    const contenidoPorId = new Map(
      (doc?.secciones ?? []).map((s) => [s.id, s.contenido ?? '']),
    );
    for (const s of this.seccionesPlantillaDocColab()) {
      const key = this.docColabControlKey(s.id);
      const raw = contenidoPorId.get(s.id) ?? '';
      const value = this.deserializarContenidoSeccion(s.tipo, raw);
      this.docColabForm.addControl(key, this.fb.control(value));
    }
    if (this.docColabEditable()) {
      this.docColabForm.enable({ emitEvent: false });
    } else {
      this.docColabForm.disable({ emitEvent: false });
    }
    this.docColabDirty = false;
  }

  private onDocColabCambioRemoto(cambio: CambioSeccionDocumento): void {
    const tramiteId = this.docColabTramiteId;
    const nodoId = this.docColabNodoId;
    if (!tramiteId || !nodoId) {
      return;
    }
    const seccion = this.seccionesPlantillaDocColab().find((s) => s.id === cambio.seccionId);
    if (!seccion) {
      return;
    }
    const key = this.docColabControlKey(cambio.seccionId);
    const control = this.docColabForm.get(key);
    if (!control) {
      return;
    }
    this.aplicandoCambioRemotoDocColab = true;
    control.setValue(this.deserializarContenidoSeccion(seccion.tipo, cambio.contenido), {
      emitEvent: false,
    });
    this.aplicandoCambioRemotoDocColab = false;
    this.marcarEdicionRemota(cambio.seccionId, cambio.usuarioNombre);
    this.cdr.markForCheck();
  }

  private marcarEdicionRemota(seccionId: string, usuarioNombre: string): void {
    const prev = this.edicionTimers.get(seccionId);
    if (prev) {
      clearTimeout(prev);
    }
    this.edicionPorSeccion.update((m) => ({ ...m, [seccionId]: usuarioNombre }));
    this.edicionTimers.set(
      seccionId,
      setTimeout(() => {
        this.edicionPorSeccion.update((m) => {
          const next = { ...m };
          delete next[seccionId];
          return next;
        });
        this.edicionTimers.delete(seccionId);
        this.cdr.markForCheck();
      }, 4000),
    );
  }

  private autoGuardarDocColaborativo(): void {
    if (
      !this.docColabHabilitado() ||
      !this.docColabEditable() ||
      !this.docColabDirty ||
      this.docColabCargando() ||
      this.docColabGuardando()
    ) {
      return;
    }
    const doc = this.buildDocumentoColaborativoParaGuardar();
    const tramiteId = this.docColabTramiteId;
    const nodoId = this.docColabNodoId;
    if (!doc || !tramiteId || !nodoId) {
      return;
    }
    this.docColabGuardando.set(true);
    this.docColabService.guardar(tramiteId, nodoId, doc).subscribe({
      next: () => {
        this.docColabDirty = false;
        this.docColabGuardando.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.docColabGuardando.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  private buildDocumentoColaborativoParaGuardar(): DocumentoColaborativo | null {
    const tramiteId = this.docColabTramiteId;
    const nodoId = this.docColabNodoId;
    if (!tramiteId || !nodoId) {
      return null;
    }
    return {
      tramiteId,
      nodoId,
      titulo: this.tituloDocColaborativo(),
      secciones: this.seccionesPlantillaDocColab().map((s) => ({
        id: s.id,
        titulo: s.titulo,
        contenido: this.contenidoSeccionDocColabPorId(s.id),
      })),
    };
  }

  private contenidoSeccionDocColabPorId(seccionId: string): string {
    const seccion = this.seccionesPlantillaDocColab().find((s) => s.id === seccionId);
    if (!seccion) {
      return '';
    }
    const key = this.docColabControlKey(seccionId);
    const raw = this.docColabForm.get(key)?.value;
    return this.serializarContenidoSeccion(seccion.tipo, raw);
  }

  private serializarContenidoSeccion(tipo: SeccionPlantillaTipo, raw: unknown): string {
    if (tipo === 'checkbox') {
      return raw === true || raw === 'true' ? 'true' : 'false';
    }
    if (raw == null) {
      return '';
    }
    return String(raw);
  }

  private deserializarContenidoSeccion(tipo: SeccionPlantillaTipo, raw: string): unknown {
    if (tipo === 'checkbox') {
      return raw === 'true';
    }
    return raw ?? '';
  }
}
