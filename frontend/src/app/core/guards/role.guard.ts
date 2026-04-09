import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { Usuario } from '../models/usuario.model';

type Rol = Usuario['rol'];

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const requerido = route.data?.['rol'] as Rol | undefined;
  const usuario = auth.getUsuario();

  if (!auth.getToken()) {
    router.navigateByUrl('/auth/login');
    return false;
  }

  if (!requerido) return true;

  if (usuario.rol !== requerido) {
    const destino =
      usuario.rol === 'ADMINISTRADOR' ? '/admin/dashboard' : '/funcionario/bandeja';
    router.navigateByUrl(destino);
    return false;
  }

  return true;
};

