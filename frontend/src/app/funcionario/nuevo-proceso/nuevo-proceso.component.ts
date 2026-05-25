import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  combineLatest,
  distinctUntilChanged,
  finalize,
  map,
  shareReplay,
  startWith,
  switchMap,
  take,
} from 'rxjs';

import { Politica } from '../../core/models/politica.model';
import { IaService, PoliticaIaItem } from '../../core/services/ia.service';
import { PoliticaService } from '../../core/services/politica.service';
import { TramiteService } from '../../core/services/tramite.service';
import { TramiteCredencialesDialogComponent } from './tramite-credenciales-dialog.component';

@Component({
  selector: 'app-nuevo-proceso',
  standalone: true,
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
  templateUrl: './nuevo-proceso.component.html',
  styleUrl: './nuevo-proceso.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NuevoProcesoComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly politicaService = inject(PoliticaService);
  private readonly tramiteService = inject(TramiteService);

  readonly enviando = signal(false);

  readonly escuchando = signal(false);
  readonly justificacion = signal('');
  readonly transcript = signal('');
  private acumuladoFinal = '';
  private recognition: {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    onresult: ((event: any) => void) | null;
    onerror: (() => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
  } | null = null;
  private readonly iaService = inject(IaService);

  readonly form = this.fb.nonNullable.group({
    nombreCompleto: ['', [Validators.required, Validators.minLength(2)]],
    telefono: ['', [Validators.required, Validators.minLength(6)]],
    email: ['', [Validators.email]],
    politicaId: ['', Validators.required],
  });

  readonly politicasActivas$ = this.politicaService.getPoliticasActivas().pipe(
    map((lista) => lista.filter((p) => p.id)),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly politicaSeleccionada$ = combineLatest([
    this.politicasActivas$,
    this.form.controls.politicaId.valueChanges.pipe(
      startWith(this.form.controls.politicaId.value),
      distinctUntilChanged(),
    ),
  ]).pipe(
    map(([lista, id]) =>
      id ? lista.find((p) => p.id === id) ?? null : null,
    ),
    map((p) => (p && p.id ? p : null)),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  cancelar(): void {
    void this.router.navigate(['/funcionario/bandeja']);
  }

  iniciarVoz(): void {
    if (this.escuchando()) {
      const textoFinal = (this.acumuladoFinal + ' ' + this.transcript()).trim();
      this.escuchando.set(false);
      const rec = this.recognition;
      this.recognition = null;
      if (rec) {
        rec.onend = null;
        rec.onerror = null;
        rec.onresult = null;
        rec.stop();
      }
      if (textoFinal.length >= 10) {
        this.sugerirPoliticaDesdeTexto(textoFinal);
      } else if (textoFinal.length > 0) {
        this.snack.open('Describe mejor la situación', 'Cerrar', { duration: 3000 });
      } else {
        this.snack.open('No se captó texto. Intente de nuevo.', 'Cerrar', { duration: 3000 });
      }
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.snack.open('Tu navegador no soporta reconocimiento de voz', 'Cerrar', { duration: 3000 });
      return;
    }

    this.acumuladoFinal = '';
    this.transcript.set('');
    this.justificacion.set('');

    const recognition = new SpeechRecognition();
    this.recognition = recognition;
    recognition.lang = 'es-ES';
    recognition.continuous = true;
    recognition.interimResults = true;
    this.escuchando.set(true);

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const chunk = result[0]?.transcript ?? '';
        if (result.isFinal) {
          this.acumuladoFinal += chunk;
        } else {
          interim += chunk;
        }
      }
      this.transcript.set((this.acumuladoFinal + interim).trim());
    };

    recognition.onerror = () => {
      this.escuchando.set(false);
      this.recognition = null;
      this.snack.open('Error al capturar voz. Intente de nuevo.', 'Cerrar', { duration: 3000 });
    };

    recognition.onend = () => {
      if (this.escuchando() && this.recognition) {
        try {
          recognition.start();
        } catch {
          this.escuchando.set(false);
          this.recognition = null;
        }
      }
    };

    recognition.start();
  }

  private sugerirPoliticaDesdeTexto(texto: string): void {
    const trimmed = texto.trim();
    if (trimmed.length < 10) {
      this.snack.open('Describe mejor la situación', 'Cerrar', { duration: 3000 });
      return;
    }
    this.politicasActivas$.pipe(take(1)).subscribe((lista) => {
      const politicas: PoliticaIaItem[] = lista.map((p) => ({
        id: p.id!,
        nombre: p.nombre,
        descripcion: (p as any).subtitulo ?? '',
      }));
      this.iaService.sugerirPolitica({ textoVoz: trimmed, politicas }).subscribe({
        next: (res) => {
          this.transcript.set('');
          this.justificacion.set(res.justificacion);
          if (res.politicaId) {
            this.form.controls.politicaId.setValue(res.politicaId);
            this.snack.open('Política sugerida automáticamente', 'OK', { duration: 3000 });
          } else {
            this.snack.open(
              'Política no disponible para esta solicitud. Comuníquese con un funcionario para más información.',
              'Cerrar',
              { duration: 5000 },
            );
          }
        },
        error: () => {
          this.transcript.set('');
          this.snack.open('No se pudo sugerir política. Elige manualmente.', 'Cerrar', { duration: 4000 });
        },
      });
    });
  }

  iniciarTramite(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { politicaId, nombreCompleto, telefono, email } =
      this.form.getRawValue();
    this.enviando.set(true);
    this.politicasActivas$
      .pipe(
        take(1),
        switchMap((lista) => {
          const p = lista.find((x) => x.id === politicaId);
          if (!p?.id) {
            throw new Error('Política no encontrada');
          }
          const emailTrim = email.trim();
          return this.tramiteService.crearTramite({
            politicaId: p.id,
            clienteNombreCompleto: nombreCompleto.trim(),
            clienteTelefono: telefono.trim(),
            ...(emailTrim ? { clienteEmail: emailTrim } : {}),
          });
        }),
        finalize(() => this.enviando.set(false)),
      )
      .subscribe({
        next: () => {
          const emailTrim = email.trim();
          this.dialog
            .open(TramiteCredencialesDialogComponent, {
              width: '480px',
              maxWidth: '92vw',
              disableClose: true,
              data: {
                nombreCompleto: nombreCompleto.trim(),
                telefono: telefono.trim(),
                email: emailTrim.length > 0 ? emailTrim : null,
              },
            })
            .afterClosed()
            .pipe(take(1))
            .subscribe(() => {
              void this.router.navigate(['/funcionario/bandeja']);
            });
        },
        error: () => {
          this.snack.open(
            'No se pudo iniciar el trámite. Intente de nuevo.',
            'Cerrar',
            { duration: 5000 },
          );
        },
      });
  }

  /** Solo nodos ACTIVIDAD, ordenados por posición horizontal del diagrama. */
  listaActividades(p: Politica): string[] {
    return [...(p.nodos ?? [])]
      .filter((n) => n.tipo === 'ACTIVIDAD')
      .sort((a, b) => a.posicionX - b.posicionX)
      .map((n) => n.etiqueta);
  }

  tiempoEstimado(p: Politica): string {
    const act = this.listaActividades(p).length;
    const dec = (p.nodos ?? []).filter((n) => n.tipo === 'DECISION').length;
    const horas = Math.max(2, act * 4 + dec * 2);
    if (horas < 24) {
      return `~${horas} h hábiles (estimado)`;
    }
    const dias = Math.round(horas / 8);
    return `~${dias} días hábiles (estimado)`;
  }

}
