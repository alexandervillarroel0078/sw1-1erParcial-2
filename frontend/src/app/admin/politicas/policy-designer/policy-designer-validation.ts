import type { AristaCanvas, NodoCanvas } from './policy-designer.models';

export interface ValidacionFlujoResultado {
  errores: string[];
  advertencias: string[];
  correcto: string[];
  tieneErrores: boolean;
}

function normEtiquetaArista(e?: string): string {
  return (e ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

function esRamaSi(etiqueta?: string): boolean {
  const t = normEtiquetaArista(etiqueta);
  return t === 'si' || t === 'yes';
}

function esRamaNo(etiqueta?: string): boolean {
  const t = normEtiquetaArista(etiqueta);
  return t === 'no';
}

/**
 * Valida el diagrama de política (nodos y aristas del lienzo).
 */
export function buildValidation(
  nodos: NodoCanvas[],
  aristas: AristaCanvas[],
): ValidacionFlujoResultado {
  const errores: string[] = [];
  const advertencias: string[] = [];
  const correcto: string[] = [];

  const porId = new Map(nodos.map((n) => [n.id, n]));
  const salientes = new Map<string, AristaCanvas[]>();
  const entrantes = new Map<string, AristaCanvas[]>();

  for (const n of nodos) {
    salientes.set(n.id, []);
    entrantes.set(n.id, []);
  }
  for (const a of aristas) {
    if (porId.has(a.desdeNodoId)) {
      salientes.get(a.desdeNodoId)!.push(a);
    }
    if (porId.has(a.haciaNodoId)) {
      entrantes.get(a.haciaNodoId)!.push(a);
    }
  }

  const hayStart = nodos.some((n) => n.tipo === 'START');
  const hayEnd = nodos.some((n) => n.tipo === 'END');

  if (!hayStart) {
    errores.push('No existe nodo START');
  }
  if (!hayEnd) {
    errores.push('No existe nodo END');
  }

  for (const n of nodos) {
    if (n.tipo === 'ACTIVIDAD') {
      const outs = salientes.get(n.id) ?? [];
      if (outs.length === 0) {
        errores.push(
          `La actividad «${n.etiqueta}» no tiene ninguna conexión de salida`,
        );
      }
    }
  }

  for (const n of nodos) {
    if (n.tipo === 'DECISION') {
      const outs = salientes.get(n.id) ?? [];
      const todasEtiquetadasSiNo = outs.every(
        (e) => esRamaSi(e.etiqueta) || esRamaNo(e.etiqueta),
      );
      const tieneSi = outs.some((e) => esRamaSi(e.etiqueta));
      const tieneNo = outs.some((e) => esRamaNo(e.etiqueta));
      if (
        outs.length === 0 ||
        !todasEtiquetadasSiNo ||
        !tieneSi ||
        !tieneNo
      ) {
        errores.push(
          `La decisión '${n.etiqueta}' debe tener ramas Sí y No definidas`,
        );
      }
    }
  }

  for (const n of nodos) {
    if (n.tipo === 'START') continue;
    const ins = entrantes.get(n.id) ?? [];
    const outs = salientes.get(n.id) ?? [];
    if (ins.length === 0 && outs.length === 0) {
      errores.push(
        `El nodo «${n.etiqueta}» (${n.tipo}) está desconectado (sin entrada ni salida)`,
      );
    }
  }

  for (const n of nodos) {
    if (n.tipo === 'ACTIVIDAD' && !n.departamento?.trim()) {
      advertencias.push(
        `La actividad «${n.etiqueta}» no tiene departamento asignado`,
      );
    }
  }

  for (const n of nodos) {
    if (n.tipo === 'ACTIVIDAD') {
      const sla = n.slaHoras;
      if (sla == null || sla <= 0) {
        advertencias.push(
          `La actividad «${n.etiqueta}» no tiene SLA definido`,
        );
      }
    }
  }

  for (const n of nodos) {
    if (n.tipo === 'JOIN_BAR') {
      const outs = salientes.get(n.id) ?? [];
      if (outs.length === 0) {
        advertencias.push(
          `El nodo JOIN «${n.etiqueta}» no tiene conexión de salida`,
        );
      }
    }
  }

  if (nodos.length > 15) {
    advertencias.push(
      `El flujo tiene ${nodos.length} nodos (más de 15); puede ser complejo de mantener`,
    );
  }

  if (hayStart && hayEnd) {
    correcto.push('El flujo tiene inicio y fin definidos');
  }

  const actividades = nodos.filter((n) => n.tipo === 'ACTIVIDAD');
  if (
    actividades.length > 0 &&
    actividades.every((n) => !!n.departamento?.trim())
  ) {
    correcto.push('Todas las actividades tienen responsable');
  }

  const desconectadosError = errores.some((e) =>
    e.includes('está desconectado'),
  );
  if (!desconectadosError && aristas.length > 0) {
    correcto.push('Todos los nodos están conectados');
  }

  return {
    errores,
    advertencias,
    correcto,
    tieneErrores: errores.length > 0,
  };
}
