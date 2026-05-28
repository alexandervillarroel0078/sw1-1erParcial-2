"""
Genera gráficos de evaluación del modelo de riesgo de demora.
Requiere: datos_entrenamiento.csv, modelo_demora.keras, scaler.pkl, history.json
"""
import csv
import json
import pickle
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import tensorflow as tf
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import train_test_split

TRAINING_DIR = Path(__file__).resolve().parent
ML_SERVICE_DIR = TRAINING_DIR.parent
DATA_PATH = TRAINING_DIR / "datos_entrenamiento.csv"
MODEL_PATH = ML_SERVICE_DIR / "modelo_demora.keras"
SCALER_PATH = ML_SERVICE_DIR / "scaler.pkl"
HISTORY_PATH = TRAINING_DIR / "history.json"
GRAFICOS_DIR = TRAINING_DIR / "graficos"

FEATURE_COLS = ["dias_abierto", "sla_dias", "progreso", "ratio"]
TARGET_COL = "demora"
VALIDATION_SPLIT = 0.2
RANDOM_STATE = 42


def cargar_datos() -> tuple[np.ndarray, np.ndarray]:
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"No se encontró {DATA_PATH}")

    rows: list[list[float]] = []
    with DATA_PATH.open(encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append([float(row[c]) for c in FEATURE_COLS] + [float(row[TARGET_COL])])

    arr = np.array(rows, dtype=np.float32)
    return arr[:, : len(FEATURE_COLS)], arr[:, -1]


def cargar_modelo_y_scaler():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"No se encontró {MODEL_PATH}")
    if not SCALER_PATH.exists():
        raise FileNotFoundError(f"No se encontró {SCALER_PATH}")

    modelo = tf.keras.models.load_model(MODEL_PATH)
    with SCALER_PATH.open("rb") as f:
        scaler = pickle.load(f)
    return modelo, scaler


def grafico_curva_aprendizaje() -> None:
    if not HISTORY_PATH.exists():
        raise FileNotFoundError(
            f"No se encontró {HISTORY_PATH}. Ejecute primero: python entrenar_modelo.py"
        )

    with HISTORY_PATH.open(encoding="utf-8") as f:
        history = json.load(f)

    epochs = range(1, len(history["loss"]) + 1)

    fig, axes = plt.subplots(1, 2, figsize=(12, 4))

    axes[0].plot(epochs, history["loss"], label="Train loss", color="#2563eb")
    axes[0].plot(epochs, history["val_loss"], label="Val loss", color="#dc2626")
    axes[0].set_xlabel("Época")
    axes[0].set_ylabel("Loss")
    axes[0].set_title("Curva de aprendizaje — Loss")
    axes[0].legend()
    axes[0].grid(True, alpha=0.3)

    axes[1].plot(epochs, history["accuracy"], label="Train accuracy", color="#2563eb")
    axes[1].plot(epochs, history["val_accuracy"], label="Val accuracy", color="#dc2626")
    axes[1].set_xlabel("Época")
    axes[1].set_ylabel("Accuracy")
    axes[1].set_title("Curva de aprendizaje — Accuracy")
    axes[1].legend()
    axes[1].grid(True, alpha=0.3)

    fig.tight_layout()
    out = GRAFICOS_DIR / "curva_aprendizaje.png"
    fig.savefig(out, dpi=120, bbox_inches="tight")
    plt.close(fig)
    print(f"  Guardado: {out.name}")


def grafico_roc(y_true: np.ndarray, y_prob: np.ndarray, auc: float) -> None:
    fpr, tpr, _ = roc_curve(y_true, y_prob)

    fig, ax = plt.subplots(figsize=(6, 6))
    ax.plot(fpr, tpr, color="#7c3aed", lw=2, label=f"AUC = {auc:.4f}")
    ax.plot([0, 1], [0, 1], color="#9ca3af", linestyle="--", lw=1)
    ax.set_xlabel("Tasa de falsos positivos (FPR)")
    ax.set_ylabel("Tasa de verdaderos positivos (TPR)")
    ax.set_title("Curva ROC")
    ax.legend(loc="lower right")
    ax.grid(True, alpha=0.3)

    out = GRAFICOS_DIR / "roc_curve.png"
    fig.savefig(out, dpi=120, bbox_inches="tight")
    plt.close(fig)
    print(f"  Guardado: {out.name}")


def grafico_distribucion_probabilidades(y_true: np.ndarray, y_prob: np.ndarray) -> None:
    prob_0 = y_prob[y_true == 0]
    prob_1 = y_prob[y_true == 1]

    fig, ax = plt.subplots(figsize=(8, 5))
    ax.hist(prob_0, bins=40, alpha=0.6, label="Clase real 0 (sin demora)", color="#16a34a")
    ax.hist(prob_1, bins=40, alpha=0.6, label="Clase real 1 (demorado)", color="#dc2626")
    ax.axvline(0.5, color="#374151", linestyle="--", lw=1, label="Umbral 0.5")
    ax.set_xlabel("Probabilidad predicha")
    ax.set_ylabel("Frecuencia")
    ax.set_title("Distribución de probabilidades predichas")
    ax.legend()
    ax.grid(True, alpha=0.3)

    out = GRAFICOS_DIR / "distribucion_probabilidades.png"
    fig.savefig(out, dpi=120, bbox_inches="tight")
    plt.close(fig)
    print(f"  Guardado: {out.name}")


def grafico_matriz_confusion(cm: np.ndarray) -> None:
    fig, ax = plt.subplots(figsize=(5, 4))
    im = ax.imshow(cm, cmap="Blues")
    ax.set_xticks([0, 1])
    ax.set_yticks([0, 1])
    ax.set_xticklabels(["Pred 0", "Pred 1"])
    ax.set_yticklabels(["Real 0", "Real 1"])
    ax.set_xlabel("Predicción")
    ax.set_ylabel("Clase real")
    ax.set_title("Matriz de confusión")

    for i in range(2):
        for j in range(2):
            color = "white" if cm[i, j] > cm.max() / 2 else "black"
            ax.text(j, i, f"{cm[i, j]:,}", ha="center", va="center", color=color, fontsize=12)

    fig.colorbar(im, ax=ax, fraction=0.046)
    out = GRAFICOS_DIR / "matriz_confusion.png"
    fig.savefig(out, dpi=120, bbox_inches="tight")
    plt.close(fig)
    print(f"  Guardado: {out.name}")


def main() -> None:
    GRAFICOS_DIR.mkdir(parents=True, exist_ok=True)

    print("Cargando datos, modelo y scaler...")
    X, y = cargar_datos()
    modelo, scaler = cargar_modelo_y_scaler()

    X_scaled = scaler.transform(X)
    _, X_test, _, y_test = train_test_split(
        X_scaled, y, test_size=VALIDATION_SPLIT, random_state=RANDOM_STATE, stratify=y
    )

    y_prob = modelo.predict(X_test, verbose=0).ravel()
    y_pred = (y_prob >= 0.5).astype(int)

    acc = accuracy_score(y_test, y_pred)
    auc = roc_auc_score(y_test, y_prob)
    precision = precision_score(y_test, y_pred, zero_division=0)
    recall = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    cm = confusion_matrix(y_test, y_pred)

    print("\nGenerando gráficos...")
    grafico_curva_aprendizaje()
    grafico_roc(y_test, y_prob, auc)
    grafico_distribucion_probabilidades(y_test, y_prob)
    grafico_matriz_confusion(cm)

    print("\n--- Resumen (conjunto de test, 20%) ---")
    print(f"  Accuracy:  {acc:.4f}")
    print(f"  AUC:       {auc:.4f}")
    print(f"  Precision: {precision:.4f}")
    print(f"  Recall:    {recall:.4f}")
    print(f"  F1-Score:  {f1:.4f}")
    print(f"\nGráficos en: {GRAFICOS_DIR}")


if __name__ == "__main__":
    main()
