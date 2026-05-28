"""
Genera datos sintéticos de entrenamiento para el modelo de riesgo de demora.
Salida: datos_entrenamiento.csv (100 000 registros)
"""
import csv
from pathlib import Path

import numpy as np

N_REGISTROS = 100_000
RNG = np.random.default_rng(42)

SLA_CHOICES = np.array([1, 3, 5, 7, 15, 30], dtype=float)
SLA_WEIGHTS = np.array([5, 25, 30, 25, 10, 5], dtype=float)

TOTAL_PASOS_CHOICES = np.arange(2, 9)
TOTAL_PASOS_WEIGHTS = np.array([8, 22, 28, 24, 12, 4, 2], dtype=float)

DEPARTAMENTO_IDS = np.array([1, 2, 3, 4, 5])
DEPARTAMENTO_WEIGHTS = np.array([25, 30, 15, 12, 18], dtype=float)
DEPARTAMENTOS_LENTOS = {3, 4}

OUTPUT_PATH = Path(__file__).resolve().parent / "datos_entrenamiento.csv"


def _generar_dias_abierto_base(n: int) -> np.ndarray:
    raw = RNG.lognormal(mean=1.5, sigma=0.8, size=n)
    return np.clip(raw, 0.0, 90.0)


def _etiqueta_demora(
    ratio: np.ndarray,
    progreso: np.ndarray,
    rng: np.random.Generator,
) -> np.ndarray:
    prob = np.full(len(ratio), 0.20)

    prob[(ratio < 0.4) & (progreso > 0.6)] = 0.05
    prob[(ratio > 0.6) & (progreso < 0.3)] = 0.60
    prob[(ratio > 0.8) & (progreso < 0.4)] = 0.80
    prob[ratio > 1.0] = 0.95

    demora = (rng.random(len(ratio)) < prob).astype(np.int8)

    # Ruido: 3% de registros invierten su etiqueta
    flip = rng.random(len(ratio)) < 0.03
    demora[flip] = 1 - demora[flip]

    return demora


def generar_dataset(n: int = N_REGISTROS) -> dict[str, np.ndarray]:
    sla_dias = RNG.choice(SLA_CHOICES, size=n, p=SLA_WEIGHTS / SLA_WEIGHTS.sum())
    total_pasos = RNG.choice(
        TOTAL_PASOS_CHOICES,
        size=n,
        p=TOTAL_PASOS_WEIGHTS / TOTAL_PASOS_WEIGHTS.sum(),
    )
    paso_actual = np.array(
        [RNG.integers(0, tp + 1) for tp in total_pasos],
        dtype=np.int32,
    )

    departamento_id = RNG.choice(
        DEPARTAMENTO_IDS,
        size=n,
        p=DEPARTAMENTO_WEIGHTS / DEPARTAMENTO_WEIGHTS.sum(),
    )

    dias_abierto = _generar_dias_abierto_base(n)

    # Departamentos 3 y 4: +20% en dias_abierto
    mask_lentos = np.isin(departamento_id, list(DEPARTAMENTOS_LENTOS))
    dias_abierto[mask_lentos] *= 1.20

    # Más pasos → más dias_abierto (factor 1.0 en 2 pasos hasta ~1.35 en 8)
    factor_pasos = 1.0 + (total_pasos.astype(float) - 2.0) * 0.05
    dias_abierto *= factor_pasos
    dias_abierto = np.clip(dias_abierto, 0.0, 90.0)

    progreso = paso_actual.astype(float) / total_pasos.astype(float)
    ratio = dias_abierto / (sla_dias + 0.01)

    demora = _etiqueta_demora(ratio, progreso, RNG)

    return {
        "dias_abierto": np.round(dias_abierto, 2),
        "sla_dias": sla_dias.astype(int),
        "progreso": np.round(progreso, 4),
        "ratio": np.round(ratio, 4),
        "departamento_id": departamento_id.astype(int),
        "total_pasos": total_pasos.astype(int),
        "paso_actual": paso_actual,
        "demora": demora,
    }


def main() -> None:
    data = generar_dataset()
    n = len(data["demora"])
    columns = [
        "dias_abierto",
        "sla_dias",
        "progreso",
        "ratio",
        "departamento_id",
        "total_pasos",
        "paso_actual",
        "demora",
    ]
    with OUTPUT_PATH.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(columns)
        for i in range(n):
            writer.writerow([data[col][i] for col in columns])

    demoras = int(data["demora"].sum())
    print(f"Generados {n:,} registros -> {OUTPUT_PATH}")
    print(f"  Demoras (1): {demoras:,} ({demoras / n * 100:.1f}%)")
    print(
        f"  ratio  mean={data['ratio'].mean():.3f}  "
        f"progreso mean={data['progreso'].mean():.3f}"
    )


if __name__ == "__main__":
    main()









# La técnica que usamos se llama Synthetic Data Generation con 
# distribuciones estadísticas controladas.
# Específicamente combinamos varias técnicas:
# 1. Distribuciones de probabilidad no uniformes
# En lugar de random puro, cada variable sigue una distribución 
# que imita la realidad — lognormal para días abiertos 
# (mayoría de trámites se resuelven rápido, pocos se demoran mucho), 
# igual que en la vida real.
# 2. Correlaciones entre variables
# Las variables no son independientes — departamentos lentos tienen 
# más días, más pasos implican más tiempo. Esto es lo que separa datos 
# sintéticos realistas de random puro.
# 3. Etiquetado probabilístico con reglas de negocio
# No se etiqueta con reglas exactas sino con probabilidades —
#  ratio > 1.0 → 95% de ser demorado, no 100%. Imita la incertidumbre del mundo real.
# 4. Ruido controlado (Label Noise)
# El 3% de flip de etiquetas simula errores humanos y 
# casos atípicos — trámites que parecen demorados pero se resuelven, y viceversa.

# Esta combinación se llama en la literatura Rule-Based 
# Synthetic Data Generation y es ampliamente usada en proyectos 
# de ML cuando no hay datos históricos suficientes. Empresas como 
# Google y Amazon la usan para entrenar modelos iniciales antes de tener datos reales.









