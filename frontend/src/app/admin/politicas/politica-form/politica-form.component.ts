import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';

import { Politica } from '../../../core/models/politica.model';

export type PoliticaFormData = {
  modo: 'crear' | 'editar';
  politica?: Politica;
};

export type PoliticaFormResult = Pick<Politica, 'nombre' | 'subtitulo' | 'colorTema'>;

type ColorOpt = { label: string; value: string };

@Component({
  selector: 'app-politica-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
  ],
  templateUrl: './politica-form.component.html',
  styleUrl: './politica-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PoliticaFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly ref = inject(MatDialogRef<PoliticaFormComponent, PoliticaFormResult | null>);
  readonly data = inject(MAT_DIALOG_DATA) as PoliticaFormData;

  readonly colores: ColorOpt[] = [
    { label: 'Azul', value: '#1976d2' },
    { label: 'Verde', value: '#639922' },
    { label: 'Naranja', value: '#EF9F27' },
    { label: 'Morado', value: '#7b1fa2' },
    { label: 'Rojo', value: '#E24B4A' },
  ];

  readonly form = this.fb.nonNullable.group({
    nombre: this.fb.nonNullable.control(this.data.politica?.nombre ?? '', {
      validators: [Validators.required],
    }),
    subtitulo: this.fb.nonNullable.control(this.data.politica?.subtitulo ?? ''),
    colorTema: this.fb.nonNullable.control(this.data.politica?.colorTema ?? '#1976d2', {
      validators: [Validators.required],
    }),
  });

  get titulo(): string {
    return this.data.modo === 'editar' ? 'Editar política' : 'Nueva política';
  }

  cancel(): void {
    this.ref.close(null);
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const { nombre, subtitulo, colorTema } = this.form.getRawValue();
    this.ref.close({
      nombre: nombre.trim(),
      subtitulo: subtitulo?.trim() || undefined,
      colorTema,
    });
  }
}

