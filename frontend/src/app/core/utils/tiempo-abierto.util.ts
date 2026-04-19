/**
 * Texto para tiempo abierto / transcurrido en días u horas.
 * Si hay menos de 1 día, muestra horas (días × 24, 1 decimal).
 */
export function formatoTiempoAbierto(dias: number | null | undefined): string {
  if (dias == null || Number.isNaN(Number(dias))) {
    return '—';
  }
  const d = Number(dias);
  if (d < 1) {
    const horas = Math.round(d * 24 * 10) / 10;
    return `${horas} ${horas === 1 ? 'hora' : 'horas'}`;
  }
  const enteros = Math.round(d);
  return `${enteros} ${enteros === 1 ? 'día' : 'días'}`;
}
