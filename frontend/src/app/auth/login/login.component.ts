import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, take } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../../core/services/auth.service';
import { Usuario } from '../../core/models/usuario.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    rol: this.fb.nonNullable.control<Usuario['rol']>('ADMINISTRADOR', {
      validators: [Validators.required],
    }),
    correo: this.fb.nonNullable.control('', {
      validators: [Validators.required, Validators.email],
    }),
    password: this.fb.nonNullable.control('', {
      validators: [Validators.required, Validators.minLength(4)],
    }),
  });

  loading = false;
  hidePassword = true;
  errorMessage = '';

  submit(): void {
    if (this.loading) return;

    this.errorMessage = '';
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const { correo, password, rol } = this.form.getRawValue();

    this.loading = true;
    this.auth
      .login({ correo, password })
      .pipe(
        take(1),
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe({
        next: (res) => {
          if (res.usuario.rol !== rol) {
            this.errorMessage =
              'El rol seleccionado no coincide con las credenciales.';
            this.auth.logout();
            return;
          }

          const destino =
            res.usuario.rol === 'ADMINISTRADOR'
              ? '/admin/dashboard'
              : '/funcionario/bandeja';
          void this.router.navigateByUrl(destino);
        },
        error: (err: unknown) => {
          const msg =
            err instanceof Error ? err.message : 'Credenciales inválidas';
          this.errorMessage = msg || 'Credenciales inválidas';
        },
      });
  }

  demoFill(): void {
    const rol = this.form.controls.rol.value;
    if (rol === 'ADMINISTRADOR') {
      this.form.patchValue({ correo: 'admin@demo.com', password: 'admin123' });
    } else {
      this.form.patchValue({
        correo: 'funcionario@demo.com',
        password: 'funcionario123',
      });
    }
  }
}

