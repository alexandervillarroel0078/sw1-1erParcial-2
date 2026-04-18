import type { AristaHaciaPuerto, OrientacionCalles } from '../../../core/models/politica.model';
import type {
  AristaCanvas,
  CalleCanvas,
  NodoCanvas,
  NodoCanvasTipo,
} from './policy-designer.models';

const PORT = 8;
/** Radio de redondeo en esquinas de aristas ortogonales (px). */
const ARISTA_ESQUINA_R = 10;
/** Mitad del ancho horizontal del rombo DECISIÓN (coincide con el polígono del SVG). */
const DECISION_L = 44;
/** Mitad del rombo FORK/JOIN (coincide con points ±40 del SVG). */
const PARALLEL_L = 40;

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
      return { hw: PARALLEL_L, hh: PARALLEL_L };
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

/** Puerto en punta del rombo paralelo (misma convención que DECISIÓN, L = 40). */
export function puertoVerticesLocalParallel(
  lado: AristaHaciaPuerto,
): { cx: number; cy: number } {
  switch (lado) {
    case 'N':
      return { cx: 0, cy: -PARALLEL_L - PORT };
    case 'S':
      return { cx: 0, cy: PARALLEL_L + PORT };
    case 'E':
      return { cx: PARALLEL_L + PORT, cy: 0 };
    case 'O':
      return { cx: -PARALLEL_L - PORT, cy: 0 };
  }
}

export function puertoMundoVerticesParallel(
  n: NodoCanvas,
  lado: AristaHaciaPuerto,
): { x: number; y: number } {
  const loc = puertoVerticesLocalParallel(lado);
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

export function puertoMundoDesde(
  desde: NodoCanvas,
  desdePuerto?: AristaHaciaPuerto | null,
): { x: number; y: number } {
  if (desde.tipo === 'FORK_BAR') {
    let lado: AristaHaciaPuerto = desdePuerto ?? 'E';
    if (lado === 'O') {
      lado = 'E';
    }
    return puertoMundoVerticesParallel(desde, lado);
  }
  if (desde.tipo === 'JOIN_BAR') {
    return puertoMundoVerticesParallel(desde, 'E');
  }
  return puertoMundo(desde, 'out');
}

function puntoEntradaHacia(
  hacia: NodoCanvas,
  haciaPuerto?: AristaHaciaPuerto | null,
): { x: number; y: number } {
  if (hacia.tipo === 'DECISION') {
    const lado = haciaPuerto ?? 'O';
    return puertoMundoEntradaDecision(hacia, lado);
  }
  if (hacia.tipo === 'JOIN_BAR') {
    let lado: AristaHaciaPuerto = haciaPuerto ?? 'O';
    if (lado === 'E') {
      lado = 'O';
    }
    return puertoMundoVerticesParallel(hacia, lado);
  }
  return puertoMundo(hacia, 'in');
}

function radioEsquinaArista(...mediasLongitudes: number[]): number {
  const m = Math.min(...mediasLongitudes.map((l) => Math.abs(l)));
  const r = Math.min(ARISTA_ESQUINA_R, m);
  return r < 0.25 ? 0 : r;
}

export function pathBezierEntreNodos(
  desde: NodoCanvas,
  hacia: NodoCanvas,
  haciaPuerto?: AristaHaciaPuerto | null,
  desdePuerto?: AristaHaciaPuerto | null,
): string {
  const a = puertoMundoDesde(desde, desdePuerto);
  const b = puntoEntradaHacia(hacia, haciaPuerto);
  const { x: x1, y: y1 } = a;
  const { x: x2, y: y2 } = b;

  // Mismo nivel: segmento horizontal directo.
  if (y1 === y2) {
    return `M ${x1} ${y1} H ${x2}`;
  }

  // Flujo hacia derecha: H -> V -> H con esquinas redondeadas (Q).
  if (x2 > x1) {
    const midX = (x1 + x2) / 2;
    const dx1 = midX - x1;
    const dx2 = x2 - midX;
    const dy = y2 - y1;
    const r = radioEsquinaArista(dx1, dx2, Math.abs(dy) / 2);
    if (r === 0) {
      return `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`;
    }
    if (dy > 0) {
      return [
        `M ${x1} ${y1}`,
        `L ${midX - r} ${y1}`,
        `Q ${midX} ${y1} ${midX} ${y1 + r}`,
        `L ${midX} ${y2 - r}`,
        `Q ${midX} ${y2} ${midX + r} ${y2}`,
        `L ${x2} ${y2}`,
      ].join(' ');
    }
    return [
      `M ${x1} ${y1}`,
      `L ${midX - r} ${y1}`,
      `Q ${midX} ${y1} ${midX} ${y1 - r}`,
      `L ${midX} ${y2 + r}`,
      `Q ${midX} ${y2} ${midX + r} ${y2}`,
      `L ${x2} ${y2}`,
    ].join(' ');
  }

  // Flujo hacia izquierda / loop: V -> H -> V con esquinas redondeadas.
  const midY = (y1 + y2) / 2;
  const dy1 = midY - y1;
  const dy2 = y2 - midY;
  const dx = x2 - x1;

  if (Math.abs(dx) < 1e-6) {
    return `M ${x1} ${y1} V ${y2}`;
  }

  const r = radioEsquinaArista(Math.abs(dy1), Math.abs(dy2), Math.abs(dx) / 2);
  if (r === 0) {
    return `M ${x1} ${y1} V ${midY} H ${x2} V ${y2}`;
  }

  if (dx < 0) {
    if (dy1 > 0) {
      return [
        `M ${x1} ${y1}`,
        `L ${x1} ${midY - r}`,
        `Q ${x1} ${midY} ${x1 - r} ${midY}`,
        `L ${x2 + r} ${midY}`,
        `Q ${x2} ${midY} ${x2} ${midY + Math.sign(dy2) * r}`,
        `L ${x2} ${y2}`,
      ].join(' ');
    }
    return [
      `M ${x1} ${y1}`,
      `L ${x1} ${midY + r}`,
      `Q ${x1} ${midY} ${x1 - r} ${midY}`,
      `L ${x2 + r} ${midY}`,
      `Q ${x2} ${midY} ${x2} ${midY + Math.sign(dy2) * r}`,
      `L ${x2} ${y2}`,
    ].join(' ');
  }

  // dx > 0 en rama x2 <= x1 no ocurre; cubre dx === 0 arriba.
  return `M ${x1} ${y1} V ${midY} H ${x2} V ${y2}`;
}

/** Punto medio geométrico sobre la polilínea ortogonal de la arista. */
export function puntoMedioBezierArista(
  desde: NodoCanvas,
  hacia: NodoCanvas,
  haciaPuerto?: AristaHaciaPuerto | null,
  desdePuerto?: AristaHaciaPuerto | null,
): { x: number; y: number } {
  const a = puertoMundoDesde(desde, desdePuerto);
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
