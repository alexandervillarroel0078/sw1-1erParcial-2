import { DatePipe, isPlatformBrowser, NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnDestroy,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatToolbarModule } from '@angular/material/toolbar';
import { catchError, map, of, switchMap, take, tap } from 'rxjs';

import { Informe } from '../../core/models/informe.model';
import { etiquetaClienteReferencia, Tarea } from '../../core/models/tarea.model';
import { AuthService } from '../../core/services/auth.service';
import { InformeService } from '../../core/services/informe.service';
import { TareaService } from '../../core/services/tarea.service';

export type ModoEntrada = 'texto' | 'voz';

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
  ],
  templateUrl: './reporte-actividad.component.html',
  styleUrl: './reporte-actividad.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReporteActividadComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tareaService = inject(TareaService);
  private readonly informeService = inject(InformeService);
  private readonly auth = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly cargando = signal(true);
  readonly tarea = signal<Tarea | null>(null);
  readonly informe = signal<Informe | null>(null);

  readonly modo = signal<ModoEntrada>('texto');
  readonly grabando = signal(false);
  readonly lineaVoz = signal('');
  readonly speechDisponible = signal(false);
  readonly enviando = signal(false);

  private acumuladoFinal = '';
  /** Web Speech API — tipado laxo (webkit / prefijos) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private recognition: any = null;

  readonly form = this.fb.nonNullable.group({
    descripcion: ['', [Validators.required, Validators.minLength(3)]],
    resultado: this.fb.nonNullable.control<string>('', {
      validators: [Validators.required],
    }),
    observaciones: [''],
  });

  readonly resultados = [
    { value: 'Aprobado', label: 'Aprobado' },
    { value: 'Rechazado', label: 'Rechazado' },
    { value: 'En revisión', label: 'En revisión' },
  ];

  constructor() {
    this.route.paramMap
      .pipe(
        tap(() => {
          this.cargando.set(true);
          this.informe.set(null);
        }),
        takeUntilDestroyed(this.destroyRef),
        switchMap((pm) => {
          const id = pm.get('id');
          if (!id) {
            return of({ tarea: null as Tarea | null, informe: null as Informe | null });
          }
          return this.tareaService.getTareaById(id).pipe(
            switchMap((t) => {
              if (!t) {
                return of({ tarea: null as Tarea | null, informe: null as Informe | null });
              }
              if (t.estado !== 'completado') {
                return of({ tarea: t, informe: null as Informe | null });
              }
              return this.informeService.getInformePorTarea(id).pipe(
                map((informe) => ({ tarea: t, informe })),
              );
            }),
            catchError(() =>
              of({ tarea: null as Tarea | null, informe: null as Informe | null }),
            ),
          );
        }),
      )
      .subscribe({
        next: ({ tarea, informe }) => {
          this.cargando.set(false);
          if (!tarea) {
            void this.router.navigate(['/funcionario/bandeja']);
            return;
          }
          this.tarea.set(tarea);
          this.informe.set(informe);
          this.form.enable({ emitEvent: false });
          this.form.reset(
            {
              descripcion: '',
              resultado: '',
              observaciones: '',
            },
            { emitEvent: false },
          );
          if (tarea.estado === 'completado') {
            if (informe) {
              // Los valores deben aplicarse con el formulario habilitado; `mat-select` no
              // refleja bien el valor si se deshabilita el grupo en el mismo turno de CD.
              this.form.patchValue(
                {
                  descripcion: informe.descripcion ?? '',
                  resultado: informe.resultado ?? '',
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
          }
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
  }

  ngOnDestroy(): void {
    this.detenerReconocimiento();
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
      if (texto) {
        this.form.patchValue({ descripcion: texto });
      }
      this.recognition = null;
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
    this.form.patchValue({ descripcion: '' });
  }

  guardarBorrador(): void {
    const t = this.tarea();
    const uid = this.auth.getUsuario().id;
    if (!t?.tramiteId || !uid) return;

    const informe: Informe = {
      tramiteId: t.tramiteId,
      funcionarioId: uid,
      descripcion: this.form.controls.descripcion.value || '(borrador)',
      resultado: this.form.controls.resultado.value || 'En revisión',
      observaciones: this.form.controls.observaciones.value || undefined,
      esBorrador: true,
      creadoEn: new Date(),
    };

    this.informeService.crearInforme(informe).pipe(take(1)).subscribe();
  }

  completarYEnviar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const t = this.tarea();
    const uid = this.auth.getUsuario().id;
    if (!t?.id || !t.tramiteId || !uid) return;

    this.enviando.set(true);
    const { descripcion, resultado, observaciones } = this.form.getRawValue();

    const informe: Informe = {
      tramiteId: t.tramiteId,
      tareaId: t.id,
      funcionarioId: uid,
      descripcion,
      resultado,
      observaciones: observaciones?.trim() || undefined,
      esBorrador: false,
      creadoEn: new Date(),
      enviadoEn: new Date(),
    };

    this.informeService
      .crearInforme(informe)
      .pipe(
        switchMap(() => this.tareaService.completarTarea(t.id!)),
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
}
