/// Perfil cliente devuelto por `POST /api/auth/login` (campo `cliente`).
class Cliente {
  const Cliente({
    required this.id,
    required this.nombreCompleto,
    this.telefono,
    this.email,
    this.activo = true,
  });

  final String id;
  final String nombreCompleto;
  final String? telefono;
  final String? email;
  final bool activo;

  factory Cliente.fromJson(Map<String, dynamic> json) {
    return Cliente(
      id: json['id'] as String? ?? '',
      nombreCompleto: json['nombreCompleto'] as String? ?? 'Cliente',
      telefono: json['telefono'] as String?,
      email: json['email'] as String?,
      activo: json['activo'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'nombreCompleto': nombreCompleto,
        'telefono': telefono,
        'email': email,
        'activo': activo,
      };
}
