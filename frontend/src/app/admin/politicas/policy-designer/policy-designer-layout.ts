import type { NodoCanvas, NodoCanvasTipo } from './policy-designer.models';
import { nodeHalfSize } from './policy-designer.utils';

const PORT = 8;
const GAP_X = 200;
const RAMA_Y = 100;

/** Centro del siguiente nodo a la derecha del origen (ACTIVIDAD-like ancho ~128). */
export function posicionDerechaOrigen(origen: NodoCanvas): { x: number; y: number } {
  const { hw } = nodeHalfSize(origen.tipo);
  const medioActividad = 64;
  return {
    x: origen.x + hw + PORT + GAP_X + medioActividad,
    y: origen.y,
  };
}

export function posicionRelativa(
  base: { x: number; y: number },
  dx: number,
  dy: number,
): { x: number; y: number } {
  return { x: base.x + dx, y: base.y + dy };
}

/** N actividades en columna vertical a la derecha de `desde`. */
export function posicionParalelas(
  desde: NodoCanvas,
  cantidad: number,
): { x: number; y: number }[] {
  const base = posicionDerechaOrigen(desde);
  const out: { x: number; y: number }[] = [];
  const mid = (cantidad - 1) / 2;
  for (let i = 0; i < cantidad; i++) {
    out.push({
      x: base.x + 140,
      y: base.y + (i - mid) * RAMA_Y,
    });
  }
  return out;
}

export function posicionJoinDesdeActividades(
  actividades: { x: number; y: number }[],
): { x: number; y: number } {
  const maxX = Math.max(...actividades.map((a) => a.x));
  const avgY = actividades.reduce((s, a) => s + a.y, 0) / actividades.length;
  return { x: maxX + 180, y: avgY };
}

export function posicionFinDesde(
  desde: NodoCanvas,
  nodos: NodoCanvas[],
): { x: number; y: number } {
  const d = posicionDerechaOrigen(desde);
  const ocupado = nodos.some(
    (n) => Math.abs(n.x - d.x) < 80 && Math.abs(n.y - d.y) < 80,
  );
  if (ocupado) {
    return { x: d.x + 160, y: d.y };
  }
  return d;
}

export function crearNodoVacio(
  tipo: NodoCanvasTipo,
  x: number,
  y: number,
  etiqueta: string,
  id: string,
  departamento?: string,
  departamentoTexto?: string,
): NodoCanvas {
  return {
    id,
    tipo,
    etiqueta,
    x,
    y,
    departamento,
    departamentoTexto,
  };
}
