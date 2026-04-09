import { Routes } from '@angular/router';

export const FUNCIONARIO_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/funcionario-layout.component').then(
        (m) => m.FuncionarioLayoutComponent,
      ),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'bandeja' },
      {
        path: 'bandeja',
        loadComponent: () =>
          import('./bandeja/bandeja.component').then((m) => m.BandejaComponent),
      },
      {
        path: 'historial',
        loadComponent: () =>
          import('./historial/historial.component').then((m) => m.HistorialComponent),
      },
      {
        path: 'tareas/:id',
        loadComponent: () =>
          import('./detalle-tarea/detalle-tarea.component').then(
            (m) => m.DetalleTareaComponent,
          ),
      },
      {
        path: 'reporte/:id',
        loadComponent: () =>
          import('./reporte-actividad/reporte-actividad.component').then(
            (m) => m.ReporteActividadComponent,
          ),
      },
      {
        path: 'nuevo-proceso',
        loadComponent: () =>
          import('./nuevo-proceso/nuevo-proceso.component').then(
            (m) => m.NuevoProcesoComponent,
          ),
      },
    ],
  },
];
