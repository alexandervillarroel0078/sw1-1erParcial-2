import { isPlatformBrowser, NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
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
import { of, switchMap, take } from 'rxjs';

import { Informe } from '../../core/models/informe.model';
import { Tarea } from '../../core/models/tarea.model';
import { AuthService } from '../../core/services/auth.service';
import { InformeService } from '../../core/services/informe.service';
import { TareaService } from '../../core/services/tarea.service';

export type ModoEntrada = 'texto' | 'voz';

@Component({
  selector: 'app-reporte-actividad',
  standalone: true,
  imports: [
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

  readonly cargando = signal(true);
  readonly tarea = signal<Tarea | null>(null);

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
        takeUntilDestroyed(this.destroyRef),
        switchMap((pm) => {
          const id = pm.get('id');
          if (!id) return of(null);
          return this.tareaService.getTareaById(id);
        }),
      )
      .subscribe({
        next: (t) => {
          this.cargando.set(false);
          if (!t) {
            void this.router.navigate(['/funcionario/bandeja']);
            return;
          }
          this.tarea.set(t);
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

  slaPlaceholder(dias?: number): string {
    const base = typeof dias === 'number' ? dias : 0;
    const lim = Math.max(3, base + 3);
    return `${lim} días hábiles`;
  }
}
