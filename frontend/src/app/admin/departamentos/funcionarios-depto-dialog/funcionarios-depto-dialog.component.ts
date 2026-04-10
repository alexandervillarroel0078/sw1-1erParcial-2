import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';

import { Usuario } from '../../../core/models/usuario.model';
import { FuncionarioService } from '../../../core/services/funcionario.service';
import { take } from 'rxjs';

export type FuncionariosDeptoDialogData = {
  departamentoId: string;
  departamentoNombre: string;
};

@Component({
  selector: 'app-funcionarios-depto-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatChipsModule],
  templateUrl: './funcionarios-depto-dialog.component.html',
  styleUrl: './funcionarios-depto-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FuncionariosDeptoDialogComponent {
  private readonly ref = inject(MatDialogRef<FuncionariosDeptoDialogComponent>);
  private readonly funcionarioService = inject(FuncionarioService);
  readonly data = inject(MAT_DIALOG_DATA) as FuncionariosDeptoDialogData;

  readonly funcionarios = signal<Usuario[]>([]);
  readonly listo = signal(false);

  constructor() {
    this.funcionarioService
      .getFuncionarios()
      .pipe(take(1))
      .subscribe((list) => {
        const depId = this.data.departamentoId;
        this.funcionarios.set(
          list.filter((u) => u.departamentoId === depId),
        );
        this.listo.set(true);
      });
  }

  iniciales(nombre: string): string {
    const p = nombre.trim().split(/\s+/).filter(Boolean);
    if (!p.length) return '?';
    const a = p[0][0] ?? '';
    const b = p.length > 1 ? (p[1][0] ?? '') : (p[0][1] ?? '');
    return (a + b).toUpperCase();
  }

  cerrar(): void {
    this.ref.close();
  }
}
