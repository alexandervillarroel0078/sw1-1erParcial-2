import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    // Sin SSR consideraciones por ahora: evitamos prerender para que servicios mock
    // que usan localStorage no fallen en el server.
    renderMode: RenderMode.Client,
  },
];
