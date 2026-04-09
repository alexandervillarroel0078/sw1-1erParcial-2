import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'auth/login' },
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./auth/login/login.component').then((m) => m.LoginComponent),
      },
    ],
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { rol: 'ADMINISTRADOR' },
    loadChildren: () =>
      import('./admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  /**
   * Área funcionario: bandeja, historial, detalle de tarea, reporte, nuevo trámite.
   * `NuevoProcesoComponent` se carga en lazy por la ruta hija `nuevo-proceso`
   * definida en `./funcionario/funcionario.routes.ts`.
   */
  {
    path: 'funcionario',
    canActivate: [authGuard, roleGuard],
    data: { rol: 'FUNCIONARIO' },
    loadChildren: () =>
      import('./funcionario/funcionario.routes').then((m) => m.FUNCIONARIO_ROUTES),
  },
  { path: '**', redirectTo: 'auth/login' },
];
