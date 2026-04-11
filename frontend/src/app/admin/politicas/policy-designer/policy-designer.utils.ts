import type { AristaHaciaPuerto, OrientacionCalles } from '../../../core/models/politica.model';
import type {
  AristaCanvas,
  CalleCanvas,
  NodoCanvas,
  NodoCanvasTipo,
} from './policy-designer.models';

const PORT = 8;
/** Mitad del ancho horizontal del rombo DECISIÓN (coincide con el polígono del SVG). */
const DECISION_L = 44;

export function nodeHalfSize(tipo: NodoCanvasTipo): { hw: number; hh: number } {
  switch (tipo) {
    case 'START':
      return { hw: 24, hh: 24 };
    case 'END':
      return { hw: 26, hh: 26 };
    case 'ACTIVIDAD':
      return { hw: 70, hh: 28 };
    case 'DECISION':
      return { hw: 44, hh: 44 };
    case 'FORK_BAR':
    case 'JOIN_BAR':
      return { hw: 60, hh: 10 };
    default:
      return { hw: 32, hh: 32 };
  }
}

/** Posición del puerto relativa al centro del nodo (0,0). */
export function puertoLocal(
  n: NodoCanvas,
  puerto: 'in' | 'out',
): { cx: number; cy: number } {
  const { hw } = nodeHalfSize(n.tipo);
  if (puerto === 'in') {
    return { cx: -hw - PORT, cy: 0 };
  }
  return { cx: hw + PORT, cy: 0 };
}

/** Entrada a DECISIÓN en coords locales (N=arriba, S=abajo, E=derecha, O=izquierda). */
export function puertoEntradaLocalDecision(
  lado: AristaHaciaPuerto,
): { cx: number; cy: number } {
  switch (lado) {
    case 'N':
      return { cx: 0, cy: -DECISION_L - PORT };
    case 'S':
      return { cx: 0, cy: DECISION_L + PORT };
    case 'E':
      return { cx: DECISION_L + PORT, cy: 0 };
    case 'O':
      return { cx: -DECISION_L - PORT, cy: 0 };
  }
}

export function puertoMundoEntradaDecision(
  n: NodoCanvas,
  lado: AristaHaciaPuerto,
): { x: number; y: number } {
  const loc = puertoEntradaLocalDecision(lado);
  return { x: n.x + loc.cx, y: n.y + loc.cy };
}

export function puertoMundo(
  n: NodoCanvas,
  puerto: 'in' | 'out',
): { x: number; y: number } {
  const { hw } = nodeHalfSize(n.tipo);
  if (puerto === 'in') {
    return { x: n.x - hw - PORT, y: n.y };
  }
  return { x: n.x + hw + PORT, y: n.y };
}

function puntoEntradaHacia(
  hacia: NodoCanvas,
  haciaPuerto?: AristaHaciaPuerto | null,
): { x: number; y: number } {
  if (hacia.tipo === 'DECISION') {
    const lado = haciaPuerto ?? 'O';
    return puertoMundoEntradaDecision(hacia, lado);
  }
  return puertoMundo(hacia, 'in');
}

export function pathBezierEntreNodos(
  desde: NodoCanvas,
  hacia: NodoCanvas,
  haciaPuerto?: AristaHaciaPuerto | null,
): string {
  const a = puertoMundo(desde, 'out');
  const b = puntoEntradaHacia(hacia, haciaPuerto);
  const dx = Math.max(80, Math.abs(b.x - a.x) * 0.45);
  return `M ${a.x} ${a.y} C ${a.x + dx} ${a.y} ${b.x - dx} ${b.y} ${b.x} ${b.y}`;
}

/** t = 0.5 sobre la misma curva cúbica que {@link pathBezierEntreNodos}. */
export function puntoMedioBezierArista(
  desde: NodoCanvas,
  hacia: NodoCanvas,
  haciaPuerto?: AristaHaciaPuerto | null,
): { x: number; y: number } {
  const a = puertoMundo(desde, 'out');
  const b = puntoEntradaHacia(hacia, haciaPuerto);
  const dx = Math.max(80, Math.abs(b.x - a.x) * 0.45);
  const p0 = { x: a.x, y: a.y };
  const p1 = { x: a.x + dx, y: a.y };
  const p2 = { x: b.x - dx, y: b.y };
  const p3 = { x: b.x, y: b.y };
  const t = 0.5;
  const mt = 1 - t;
  const x =
    mt * mt * mt * p0.x +
    3 * mt * mt * t * p1.x +
    3 * mt * t * t * p2.x +
    t * t * t * p3.x;
  const y =
    mt * mt * mt * p0.y +
    3 * mt * mt * t * p1.y +
    3 * mt * t * t * p2.y +
    t * t * t * p3.y;
  return { x, y };
}

export function snapshotFrom(
  nombrePolitica: string,
  nodos: NodoCanvas[],
  aristas: AristaCanvas[],
  zoom: number,
  panX: number,
  panY: number,
  calles: CalleCanvas[],
  orientacionCalles: OrientacionCalles,
): {
  nombrePolitica: string;
  nodos: NodoCanvas[];
  aristas: AristaCanvas[];
  zoom: number;
  panX: number;
  panY: number;
  calles: CalleCanvas[];
  orientacionCalles: OrientacionCalles;
} {
  return {
    nombrePolitica,
    nodos: structuredClone(nodos),
    aristas: structuredClone(aristas),
    zoom,
    panX,
    panY,
    calles: structuredClone(calles),
    orientacionCalles,
  };
}
