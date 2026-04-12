import type { AristaCanvas, NodoCanvas } from './policy-designer.models';

export interface ValidacionFlujoResultado {
  errores: string[];
  advertencias: string[];
  correcto: string[];
  tieneErrores: boolean;
}

export function normEtiquetaArista(e?: string): string {
  return (e ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

export function esRamaSi(etiqueta?: string): boolean {
  const t = normEtiquetaArista(etiqueta);
  return t === 'si' || t === 'yes';
}

export function esRamaNo(etiqueta?: string): boolean {
  const t = normEtiquetaArista(etiqueta);
  return t === 'no';
}

/** Segunda salida desde DECISIÓN: etiqueta opuesta a la ya existente. */
export function etiquetaAutomaticaSegundaSalidaDecision(
  salientesExistentes: AristaCanvas[],
): 'Sí' | 'No' {
  const tieneSi = salientesExistentes.some((e) => esRamaSi(e.etiqueta));
  const tieneNo = salientesExistentes.some((e) => esRamaNo(e.etiqueta));
  if (tieneSi && !tieneNo) return 'No';
  if (tieneNo && !tieneSi) return 'Sí';
  return 'Sí';
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
    if (n.tipo !== 'DECISION') continue;
    const outs = salientes.get(n.id) ?? [];
    if (outs.length > 2) {
      errores.push(
        `La decisión «${n.etiqueta}» no puede tener más de dos conexiones de salida`,
      );
      continue;
    }
    if (outs.length === 0 || outs.length === 1) {
      errores.push(
        `La decisión «${n.etiqueta}» debe tener exactamente dos ramas (Sí y No)`,
      );
      continue;
    }
    const countSi = outs.filter((e) => esRamaSi(e.etiqueta)).length;
    const countNo = outs.filter((e) => esRamaNo(e.etiqueta)).length;
    if (countSi !== 1 || countNo !== 1) {
      errores.push(
        `La decisión «${n.etiqueta}» debe tener una rama etiquetada «Sí» y otra «No»`,
      );
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
      const sla = n.slaMinutos;
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
