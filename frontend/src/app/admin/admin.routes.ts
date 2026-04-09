import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
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
        path: 'politicas/:id/editor',
        loadComponent: () =>
          import('./politicas/policy-designer.component').then(
            (m) => m.PolicyDesignerComponent,
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
        path: 'monitor',
        loadComponent: () =>
          import('./monitor/monitor.component').then((m) => m.MonitorComponent),
      },
      {
        path: 'analisis',
        loadComponent: () =>
          import('./analisis/analisis.component').then((m) => m.AnalisisComponent),
      },
    ],
  },
];

