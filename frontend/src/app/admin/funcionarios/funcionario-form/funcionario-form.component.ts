import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
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
  rol: Usuario['rol'];
  /** Solo cuando el rol es FUNCIONARIO */
  departamentoId?: string;
};

@Component({
  selector: 'app-funcionario-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
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
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  /** Contraseña visible como texto (solo UI). */
  readonly passwordVisible = signal(false);

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
    rol: this.fb.nonNullable.control<Usuario['rol']>(
      this.data.usuario?.rol ?? 'FUNCIONARIO',
      { validators: [Validators.required] },
    ),
    departamentoId: this.fb.nonNullable.control(
      this.data.usuario?.departamentoId ?? '',
      { validators: [] },
    ),
  });

  constructor() {
    if (this.data.modo === 'editar') {
      this.form.controls.password.setValue('', { emitEvent: false });
    }
    this.syncDepartamentoSegunRol(this.form.controls.rol.value);
    this.form.controls.rol.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((rol) => this.syncDepartamentoSegunRol(rol));
  }

  private syncDepartamentoSegunRol(rol: Usuario['rol']): void {
    const dep = this.form.controls.departamentoId;
    if (rol === 'ADMINISTRADOR') {
      dep.clearValidators();
      dep.setValue('', { emitEvent: false });
      dep.disable({ emitEvent: false });
    } else {
      dep.enable({ emitEvent: false });
      dep.setValidators([Validators.required]);
    }
    dep.updateValueAndValidity({ emitEvent: false });
    this.cdr.markForCheck();
  }

  get titulo(): string {
    return this.data.modo === 'editar' ? 'Editar funcionario' : 'Nuevo funcionario';
  }

  get departamentos(): Departamento[] {
    return this.data.departamentos;
  }

  get esFuncionario(): boolean {
    return this.form.controls.rol.value === 'FUNCIONARIO';
  }

  togglePasswordVisible(): void {
    this.passwordVisible.update((v) => !v);
    this.cdr.markForCheck();
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
      rol,
    };
    if (rol === 'FUNCIONARIO') {
      result.departamentoId = departamentoId;
    }
    if (this.data.modo === 'crear') {
      result.password = password;
    } else if (password.trim()) {
      result.password = password.trim();
    }
    this.ref.close(result);
  }
}
