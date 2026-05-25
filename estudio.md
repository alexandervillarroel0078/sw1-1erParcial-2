Frontend (JSON)
    ↓
Controller → recibe el JSON y lo mapea al DTO
    ↓
Mapper → convierte DTO → Model (entidad real)
    ↓
Service → ejecuta la lógica de negocio
    ↓
Repository → interfaz que habla con MongoDB
    ↓
MongoDB → guarda el documento


DEVUELVE

MongoDB → devuelve el Model
    ↓
Mapper → convierte Model → DTO
    ↓
Controller → devuelve el DTO como JSON al frontend




HTML → ¿Qué se ve?
SCSS → ¿Cómo se ve?
TS → ¿Qué hace?







