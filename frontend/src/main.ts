import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Polyfill requerido por sockjs-client en navegador.
(window as typeof window & { global?: Window }).global = window;

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
