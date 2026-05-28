"""
Entrena el modelo de riesgo de demora y guarda artefactos en ml-service/.
"""
from pathlib import Path

import csv
import json
import pickle

import numpy as np
import tensorflow as tf
from sklearn.metrics import accuracy_score, confusion_matrix, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from tensorflow.keras.callbacks import EarlyStopping
from tensorflow.keras.layers import Dense, Dropout, Input
from tensorflow.keras.models import Sequential
from tensorflow.keras.optimizers import Adam

TRAINING_DIR = Path(__file__).resolve().parent
ML_SERVICE_DIR = TRAINING_DIR.parent
DATA_PATH = TRAINING_DIR / "datos_entrenamiento.csv"
MODEL_PATH = ML_SERVICE_DIR / "modelo_demora.keras"
SCALER_PATH = ML_SERVICE_DIR / "scaler.pkl"
HISTORY_PATH = TRAINING_DIR / "history.json"

FEATURE_COLS = ["dias_abierto", "sla_dias", "progreso", "ratio"]
TARGET_COL = "demora"

EPOCHS = 50
BATCH_SIZE = 64
VALIDATION_SPLIT = 0.2
RANDOM_STATE = 42


def cargar_datos() -> tuple[np.ndarray, np.ndarray, StandardScaler]:
    if not DATA_PATH.exists():
        raise FileNotFoundError(
            f"No se encontró {DATA_PATH}. Ejecute primero: python generar_datos.py"
        )

    rows: list[list[float]] = []
    with DATA_PATH.open(encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append([float(row[c]) for c in FEATURE_COLS] + [float(row[TARGET_COL])])

    arr = np.array(rows, dtype=np.float32)
    X = arr[:, : len(FEATURE_COLS)]
    y = arr[:, -1]

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    return X_scaled, y, scaler


def construir_modelo(input_dim: int) -> Sequential:
    model = Sequential(
        [
            Input(shape=(input_dim,)),
            Dense(64, activation="relu"),
            Dropout(0.3),
            Dense(32, activation="relu"),
            Dropout(0.2),
            Dense(16, activation="relu"),
            Dense(1, activation="sigmoid"),
        ]
    )
    model.compile(
        optimizer=Adam(),
        loss="binary_crossentropy",
        metrics=["accuracy", tf.keras.metrics.AUC(name="auc")],
    )
    return model


def main() -> None:
    print("Cargando datos...")
    X, y, scaler = cargar_datos()

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=VALIDATION_SPLIT, random_state=RANDOM_STATE, stratify=y
    )

    print(f"  Train: {len(X_train):,}  Test: {len(X_test):,}  Positivos: {y.mean() * 100:.1f}%")

    model = construir_modelo(input_dim=len(FEATURE_COLS))

    early_stop = EarlyStopping(
        monitor="val_loss",
        patience=5,
        restore_best_weights=True,
        verbose=1,
    )

    print("\nEntrenando...")
    history = model.fit(
        X_train,
        y_train,
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        validation_split=VALIDATION_SPLIT,
        callbacks=[early_stop],
        verbose=1,
    )

    y_prob = model.predict(X_test, verbose=0).ravel()
    y_pred = (y_prob >= 0.5).astype(int)

    acc = accuracy_score(y_test, y_pred)
    auc = roc_auc_score(y_test, y_prob)
    cm = confusion_matrix(y_test, y_pred)

    print("\n--- Resultados (validación) ---")
    print(f"  Accuracy: {acc:.4f}")
    print(f"  AUC:      {auc:.4f}")
    print(f"  Épocas entrenadas: {len(history.history['loss'])}")
    print("\n  Matriz de confusión:")
    print("                 Pred 0    Pred 1")
    print(f"  Real 0 (OK)    {cm[0, 0]:>8}  {cm[0, 1]:>8}")
    print(f"  Real 1 (dem.)  {cm[1, 0]:>8}  {cm[1, 1]:>8}")

    history_serializable = {
        k: [float(v) for v in vals] for k, vals in history.history.items()
    }
    with HISTORY_PATH.open("w", encoding="utf-8") as f:
        json.dump(history_serializable, f, indent=2)
    print(f"  History guardado -> {HISTORY_PATH}")

    model.save(MODEL_PATH)
    with open(SCALER_PATH, "wb") as f:
        pickle.dump(scaler, f)

    print(f"\nModelo guardado -> {MODEL_PATH}")
    print(f"Scaler guardado -> {SCALER_PATH}")


if __name__ == "__main__":
    main()
