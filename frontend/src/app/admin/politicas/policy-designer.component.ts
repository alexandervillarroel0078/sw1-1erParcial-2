import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-policy-designer',
  standalone: true,
  template: `<h1>PolicyDesignerComponent</h1>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PolicyDesignerComponent {}

