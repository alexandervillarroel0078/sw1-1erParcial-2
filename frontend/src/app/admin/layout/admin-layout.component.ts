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
  selector: 'app-admin-layout',
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
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayoutComponent {
  private readonly auth = inject(AuthService);
  readonly router = inject(Router);
  private readonly bo = inject(BreakpointObserver);
  private readonly destroyRef = inject(DestroyRef);

  readonly navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', link: '/admin/dashboard' },
    { label: 'Políticas', icon: 'account_tree', link: '/admin/politicas' },
    { label: 'Funcionarios', icon: 'groups', link: '/admin/funcionarios' },
    { label: 'Departamentos', icon: 'business', link: '/admin/departamentos' },
    { label: 'Clientes', icon: 'people', link: '/admin/clientes' },
    { label: 'Monitor', icon: 'monitor_heart', link: '/admin/monitor' },
    { label: 'Análisis', icon: 'query_stats', link: '/admin/analisis' },
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

  // Nota: el router.events no filtra por sí solo; este getter mantiene simple el template
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
    if (url.includes('/admin/politicas')) return 'Políticas';
    if (url.includes('/admin/funcionarios')) return 'Funcionarios';
    if (url.includes('/admin/departamentos')) return 'Departamentos';
    if (url.includes('/admin/clientes')) return 'Clientes';
    if (url.includes('/admin/monitor')) return 'Monitor';
    if (url.includes('/admin/analisis')) return 'Análisis';
    return 'Dashboard';
  }
}

