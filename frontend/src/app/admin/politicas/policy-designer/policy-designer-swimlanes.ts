import type { CalleCanvas } from './policy-designer.models';

/** Origen del área de calles (mundo SVG) */
export const SWIM_ORIGIN_X = 72;
export const SWIM_ORIGIN_Y = 48;

/** Alto total del bloque vertical (cabecera + cuerpo) */
export const SWIM_VERT_TOTAL_H = 640;
export const SWIM_HEADER_V = 40;
export const SWIM_LABEL_H = 120;

/** Ancho del área de contenido en modo horizontal (junto a la etiqueta) */
export const SWIM_HORIZ_CONTENT_W = 1080;

/** Redimensión: mínimos */
export const LANE_MIN_W_RESIZE = 200;
export const LANE_MIN_W_DEFAULT = 250;
export const LANE_FIRST_W = 300;

export const LANE_MIN_H_RESIZE = 150;
export const LANE_FIRST_H = 300;
export const LANE_REST_H = 250;

export function callesOrdenadas(calles: CalleCanvas[]): CalleCanvas[] {
  return [...calles].sort((a, b) => a.orden - b.orden);
}

/** Ancho efectivo de una calle en modo vertical */
export function anchoCalleVertical(c: CalleCanvas, index: number): number {
  const v = c.anchoPx;
  if (v != null && v >= LANE_MIN_W_RESIZE) return v;
  return index === 0 ? LANE_FIRST_W : LANE_MIN_W_DEFAULT;
}

/** Alto efectivo de una calle en modo horizontal */
export function altoCalleHorizontal(c: CalleCanvas, index: number): number {
  const v = c.altoPx;
  if (v != null && v >= LANE_MIN_H_RESIZE) return v;
  return index === 0 ? LANE_FIRST_H : LANE_REST_H;
}

export function totalAnchoVertical(ordenadas: CalleCanvas[]): number {
  return ordenadas.reduce((s, c, i) => s + anchoCalleVertical(c, i), 0);
}

export function totalAltoHorizontal(ordenadas: CalleCanvas[]): number {
  return ordenadas.reduce((s, c, i) => s + altoCalleHorizontal(c, i), 0);
}

const bodyHVert = SWIM_VERT_TOTAL_H - SWIM_HEADER_V;

export function hitTestCalleVertical(
  x: number,
  y: number,
  ordenadas: CalleCanvas[],
): CalleCanvas | null {
  const n = ordenadas.length;
  if (n === 0) return null;
  const top = SWIM_ORIGIN_Y + SWIM_HEADER_V;
  const bottom = SWIM_ORIGIN_Y + SWIM_VERT_TOTAL_H;
  if (y < top || y > bottom || x < SWIM_ORIGIN_X) return null;
  let cx = SWIM_ORIGIN_X;
  for (let i = 0; i < n; i++) {
    const w = anchoCalleVertical(ordenadas[i], i);
    if (x >= cx && x < cx + w) return ordenadas[i] ?? null;
    cx += w;
  }
  return null;
}

export function hitTestCalleHorizontal(
  x: number,
  y: number,
  ordenadas: CalleCanvas[],
): CalleCanvas | null {
  const n = ordenadas.length;
  if (n === 0) return null;
  const left = SWIM_ORIGIN_X + SWIM_LABEL_H;
  const right = SWIM_ORIGIN_X + SWIM_LABEL_H + SWIM_HORIZ_CONTENT_W;
  if (x < left || x > right || y < SWIM_ORIGIN_Y) return null;
  let cy = SWIM_ORIGIN_Y;
  for (let i = 0; i < n; i++) {
    const h = altoCalleHorizontal(ordenadas[i], i);
    if (y >= cy && y < cy + h) return ordenadas[i] ?? null;
    cy += h;
  }
  return null;
}
