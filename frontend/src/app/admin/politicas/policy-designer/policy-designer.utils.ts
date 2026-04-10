import type { OrientacionCalles } from '../../../core/models/politica.model';
import type {
  AristaCanvas,
  CalleCanvas,
  NodoCanvas,
  NodoCanvasTipo,
} from './policy-designer.models';

const PORT = 8;

export function nodeHalfSize(tipo: NodoCanvasTipo): { hw: number; hh: number } {
  switch (tipo) {
    case 'START':
      return { hw: 24, hh: 24 };
    case 'END':
      return { hw: 26, hh: 26 };
    case 'ACTIVIDAD':
      return { hw: 64, hh: 28 };
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

export function puertoMundo(
  n: NodoCanvas,
  puerto: 'in' | 'out',
): { x: number; y: number } {
  const { hw, hh } = nodeHalfSize(n.tipo);
  if (puerto === 'in') {
    return { x: n.x - hw - PORT, y: n.y };
  }
  return { x: n.x + hw + PORT, y: n.y };
}

export function pathBezierEntreNodos(
  desde: NodoCanvas,
  hacia: NodoCanvas,
): string {
  const a = puertoMundo(desde, 'out');
  const b = puertoMundo(hacia, 'in');
  const dx = Math.max(80, Math.abs(b.x - a.x) * 0.45);
  return `M ${a.x} ${a.y} C ${a.x + dx} ${a.y} ${b.x - dx} ${b.y} ${b.x} ${b.y}`;
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
