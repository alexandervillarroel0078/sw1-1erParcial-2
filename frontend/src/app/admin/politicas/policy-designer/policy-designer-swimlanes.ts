import type { CalleCanvas } from './policy-designer.models';

/** Área fija en coordenadas mundo donde se dibujan las calles */
export const SWIM_WORLD_BOUNDS = { x: 72, y: 48, w: 1200, h: 640 };

export const SWIM_HEADER_V = 40;
export const SWIM_LABEL_H = 120;

export function callesOrdenadas(calles: CalleCanvas[]): CalleCanvas[] {
  return [...calles].sort((a, b) => a.orden - b.orden);
}

export function hitTestCalleVertical(
  x: number,
  y: number,
  ordenadas: CalleCanvas[],
  bounds = SWIM_WORLD_BOUNDS,
): CalleCanvas | null {
  const n = ordenadas.length;
  if (n === 0) return null;
  const top = bounds.y + SWIM_HEADER_V;
  const bottom = bounds.y + bounds.h;
  if (y < top || y > bottom || x < bounds.x || x > bounds.x + bounds.w) {
    return null;
  }
  const colW = bounds.w / n;
  const idx = Math.floor((x - bounds.x) / colW);
  if (idx < 0 || idx >= n) return null;
  return ordenadas[idx] ?? null;
}

export function hitTestCalleHorizontal(
  x: number,
  y: number,
  ordenadas: CalleCanvas[],
  bounds = SWIM_WORLD_BOUNDS,
): CalleCanvas | null {
  const n = ordenadas.length;
  if (n === 0) return null;
  const left = bounds.x + SWIM_LABEL_H;
  const right = bounds.x + bounds.w;
  if (x < left || x > right || y < bounds.y || y > bounds.y + bounds.h) {
    return null;
  }
  const rowH = bounds.h / n;
  const idx = Math.floor((y - bounds.y) / rowH);
  if (idx < 0 || idx >= n) return null;
  return ordenadas[idx] ?? null;
}
