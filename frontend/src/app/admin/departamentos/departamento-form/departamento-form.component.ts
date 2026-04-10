import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { Departamento } from '../../../core/models/departamento.model';

export type DepartamentoFormDialogData = {
  modo: 'crear' | 'editar';
  departamento?: Departamento;
};

export type DepartamentoFormResult = {
  nombre: string;
};

@Component({
  selector: 'app-departamento-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './departamento-form.component.html',
  styleUrl: './departamento-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartamentoFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly ref = inject(
    MatDialogRef<DepartamentoFormComponent, DepartamentoFormResult | null>,
  );
  readonly data = inject(MAT_DIALOG_DATA) as DepartamentoFormDialogData;

  readonly form = this.fb.nonNullable.group({
    nombre: this.fb.nonNullable.control(this.data.departamento?.nombre ?? '', {
      validators: [Validators.required],
    }),
  });

  get titulo(): string {
    return this.data.modo === 'editar' ? 'Editar departamento' : 'Nuevo departamento';
  }

  cancelar(): void {
    this.ref.close(null);
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.ref.close({ nombre: this.form.controls.nombre.value.trim() });
  }
}
