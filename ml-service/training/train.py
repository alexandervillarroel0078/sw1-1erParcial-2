import numpy as np
from sklearn.preprocessing import StandardScaler
import pickle, tensorflow as tf

np.random.seed(42)
n = 1000
dias = np.random.exponential(5, n)
sla_dias = np.random.choice([1, 2, 3, 5, 10], n).astype(float)
progreso = np.random.uniform(0, 1, n)
ratio = dias / sla_dias

X = np.column_stack([dias, sla_dias, progreso, ratio])
y = (ratio > 0.8).astype(int)

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

model = tf.keras.Sequential([
    tf.keras.layers.Dense(64, activation='relu', input_shape=(4,)),
    tf.keras.layers.Dropout(0.3),
    tf.keras.layers.Dense(32, activation='relu'),
    tf.keras.layers.Dropout(0.2),
    tf.keras.layers.Dense(16, activation='relu'),
    tf.keras.layers.Dense(1, activation='sigmoid')
])
model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
model.fit(X_scaled, y, epochs=20, batch_size=32, verbose=1)

model.save('../modelo_demora.keras')
with open('../scaler.pkl', 'wb') as f:
    pickle.dump(scaler, f)

print("Modelo y scaler guardados.")