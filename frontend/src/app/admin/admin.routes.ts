import { Routes } from '@angular/router';

/**
 * Rutas bajo `/admin/`.
 * El diseñador de políticas va primero: pantalla completa sin `AdminLayoutComponent`
 * (sin sidebar ni toolbar del admin); el resto usa layout con hijos.
 */
export const ADMIN_ROUTES: Routes = [
  {
    path: 'politicas/:id/editor',
    loadComponent: () =>
      import('./politicas/policy-designer/policy-designer.component').then(
        (m) => m.PolicyDesignerComponent,
      ),
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/admin-layout.component').then(
        (m) => m.AdminLayoutComponent,
      ),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'politicas',
        loadComponent: () =>
          import('./politicas/politica-list/politica-list.component').then(
            (m) => m.PoliticaListComponent,
          ),
      },
      {
        path: 'politicas/:politicaId/formulario/:nodoId',
        loadComponent: () =>
          import('./politicas/formulario-designer/formulario-designer.component').then(
            (m) => m.FormularioDesignerComponent,
          ),
      },
      {
        path: 'funcionarios',
        loadComponent: () =>
          import('./funcionarios/funcionarios.component').then(
            (m) => m.FuncionariosComponent,
          ),
      },
      {
        path: 'departamentos',
        loadComponent: () =>
          import('./departamentos/departamentos.component').then(
            (m) => m.DepartamentosComponent,
          ),
      },
      {
        path: 'clientes',
        loadComponent: () =>
          import('./clientes/clientes.component').then((m) => m.ClientesComponent),
      },
      {
        path: 'monitor',
        loadComponent: () =>
          import('./monitor/monitor.component').then((m) => m.MonitorComponent),
      },
      {
        path: 'tramites/:id/detalle',
        loadComponent: () =>
          import('./tramites/tramite-detalle/tramite-detalle.component').then(
            (m) => m.TramiteDetalleComponent,
          ),
      },
      {
        path: 'analisis',
        loadComponent: () =>
          import('./analisis/analisis.component').then((m) => m.AnalisisComponent),
      },
    ],
  },
];

