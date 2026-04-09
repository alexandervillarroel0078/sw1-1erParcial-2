import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map, startWith } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';

import { AuthService } from '../../core/services/auth.service';

type NavItem = { label: string; icon: string; link: string };

@Component({
  selector: 'app-funcionario-layout',
  standalone: true,
  imports: [
    NgIf,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
  ],
  templateUrl: './funcionario-layout.component.html',
  styleUrl: './funcionario-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FuncionarioLayoutComponent {
  private readonly auth = inject(AuthService);
  readonly router = inject(Router);
  private readonly bo = inject(BreakpointObserver);
  private readonly destroyRef = inject(DestroyRef);

  readonly navItems: NavItem[] = [
    { label: 'Mis Tareas', icon: 'inbox', link: '/funcionario/bandeja' },
    { label: 'Nuevo Trámite', icon: 'add_circle_outline', link: '/funcionario/nuevo-proceso' },
    { label: 'Historial', icon: 'history', link: '/funcionario/historial' },
  ];

  readonly isHandset$ = this.bo.observe([Breakpoints.Handset, Breakpoints.TabletPortrait]).pipe(
    map((r) => r.matches),
    startWith(false),
  );

  isHandset = false;

  constructor() {
    this.isHandset$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => (this.isHandset = v));
  }

  get usuarioNombre(): string {
    return this.auth.getUsuario().nombre || '—';
  }

  get avatarIniciales(): string {
    const nombre = (this.auth.getUsuario().nombre || '').trim();
    if (!nombre) return 'U';
    const partes = nombre.split(/\s+/).filter(Boolean);
    const a = partes[0]?.[0] ?? 'U';
    const b = partes.length > 1 ? (partes[1]?.[0] ?? '') : (partes[0]?.[1] ?? '');
    return (a + b).toUpperCase();
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/auth/login');
  }

  onNavClick(drawer: { close: () => void }): void {
    if (this.isHandset) drawer.close();
  }

  resolveTitleFromUrl(url: string): string {
    if (url.includes('/funcionario/bandeja')) return 'Mis Tareas';
    if (url.includes('/funcionario/nuevo-proceso')) return 'Nuevo Trámite';
    if (url.includes('/funcionario/historial')) return 'Historial';
    if (url.includes('/funcionario/reporte')) return 'Reporte de actividad';
    if (url.includes('/funcionario/tareas')) return 'Detalle de tarea';
    return 'Workflow';
  }
}
