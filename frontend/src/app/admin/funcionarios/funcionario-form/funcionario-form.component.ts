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
import { MatSelectModule } from '@angular/material/select';

import { Departamento } from '../../../core/models/departamento.model';
import { Usuario } from '../../../core/models/usuario.model';

export type FuncionarioFormDialogData = {
  modo: 'crear' | 'editar';
  usuario?: Usuario;
  departamentos: Departamento[];
};

export type FuncionarioFormResult = {
  nombre: string;
  correo: string;
  password?: string;
  departamentoId: string;
  rol: Usuario['rol'];
};

@Component({
  selector: 'app-funcionario-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './funcionario-form.component.html',
  styleUrl: './funcionario-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FuncionarioFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly ref = inject(
    MatDialogRef<FuncionarioFormComponent, FuncionarioFormResult | null>,
  );
  readonly data = inject(MAT_DIALOG_DATA) as FuncionarioFormDialogData;

  readonly form = this.fb.nonNullable.group({
    nombre: this.fb.nonNullable.control(this.data.usuario?.nombre ?? '', {
      validators: [Validators.required],
    }),
    correo: this.fb.nonNullable.control(this.data.usuario?.correo ?? '', {
      validators: [Validators.required, Validators.email],
    }),
    password: this.fb.nonNullable.control('', {
      validators:
        this.data.modo === 'crear' ? [Validators.required, Validators.minLength(4)] : [],
    }),
    departamentoId: this.fb.nonNullable.control(
      this.data.usuario?.departamentoId ?? '',
      { validators: [Validators.required] },
    ),
    rol: this.fb.nonNullable.control<Usuario['rol']>(
      this.data.usuario?.rol ?? 'FUNCIONARIO',
      { validators: [Validators.required] },
    ),
  });

  get titulo(): string {
    return this.data.modo === 'editar' ? 'Editar funcionario' : 'Nuevo funcionario';
  }

  get departamentos(): Departamento[] {
    return this.data.departamentos;
  }

  cancelar(): void {
    this.ref.close(null);
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const { nombre, correo, password, departamentoId, rol } =
      this.form.getRawValue();

    const result: FuncionarioFormResult = {
      nombre: nombre.trim(),
      correo: correo.trim(),
      departamentoId,
      rol,
    };
    if (this.data.modo === 'crear') {
      result.password = password;
    } else if (password.trim()) {
      result.password = password.trim();
    }
    this.ref.close(result);
  }
}
