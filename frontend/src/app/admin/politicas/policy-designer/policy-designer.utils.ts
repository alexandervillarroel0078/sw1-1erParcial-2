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
  const { x: x1, y: y1 } = a;
  const { x: x2, y: y2 } = b;

  // Mismo nivel: segmento horizontal directo.
  if (y1 === y2) {
    return `M ${x1} ${y1} H ${x2}`;
  }

  // Flujo hacia derecha: H -> V -> H (forma Z/S).
  if (x2 > x1) {
    const midX = (x1 + x2) / 2;
    return `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`;
  }

  // Flujo hacia izquierda / loop: V -> H -> V.
  const midY = (y1 + y2) / 2;
  return `M ${x1} ${y1} V ${midY} H ${x2} V ${y2}`;
}

/** Punto medio geométrico sobre la polilínea ortogonal de la arista. */
export function puntoMedioBezierArista(
  desde: NodoCanvas,
  hacia: NodoCanvas,
  haciaPuerto?: AristaHaciaPuerto | null,
): { x: number; y: number } {
  const a = puertoMundo(desde, 'out');
  const b = puntoEntradaHacia(hacia, haciaPuerto);
  const { x: x1, y: y1 } = a;
  const { x: x2, y: y2 } = b;

  const puntos: { x: number; y: number }[] = [{ x: x1, y: y1 }];
  if (y1 === y2) {
    puntos.push({ x: x2, y: y2 });
  } else if (x2 > x1) {
    const midX = (x1 + x2) / 2;
    puntos.push({ x: midX, y: y1 }, { x: midX, y: y2 }, { x: x2, y: y2 });
  } else {
    const midY = (y1 + y2) / 2;
    puntos.push({ x: x1, y: midY }, { x: x2, y: midY }, { x: x2, y: y2 });
  }

  const segs: { a: { x: number; y: number }; b: { x: number; y: number }; len: number }[] = [];
  let total = 0;
  for (let i = 0; i < puntos.length - 1; i++) {
    const pa = puntos[i];
    const pb = puntos[i + 1];
    const len = Math.hypot(pb.x - pa.x, pb.y - pa.y);
    segs.push({ a: pa, b: pb, len });
    total += len;
  }
  if (total <= 0) return { x: x1, y: y1 };

  const half = total / 2;
  let acc = 0;
  for (const s of segs) {
    if (acc + s.len >= half) {
      const t = s.len > 0 ? (half - acc) / s.len : 0;
      return {
        x: s.a.x + (s.b.x - s.a.x) * t,
        y: s.a.y + (s.b.y - s.a.y) * t,
      };
    }
    acc += s.len;
  }
  const last = puntos[puntos.length - 1];
  return { x: last.x, y: last.y };
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
