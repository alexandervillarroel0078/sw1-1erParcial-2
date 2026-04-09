import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-politica-list',
  standalone: true,
  template: `<h1>PoliticaListComponent</h1>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PoliticaListComponent {}

