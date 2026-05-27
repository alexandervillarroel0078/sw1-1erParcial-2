import 'package:flutter/material.dart';

/// Badge de color según [EstadoTramite] del backend.
class EstadoBadge extends StatelessWidget {
  const EstadoBadge({super.key, required this.estado});

  final String estado;

  @override
  Widget build(BuildContext context) {
    final s = estado.toUpperCase();
    late Color bg;
    late Color fg;
    late String label;

    switch (s) {
      case 'INICIADO':
        bg = const Color(0xFFE3F2FD);
        fg = const Color(0xFF1565C0);
        label = 'Iniciado';
        break;
      case 'EN_PROCESO':
        bg = const Color(0xFFFFF8E1);
        fg = const Color(0xFFF57F17);
        label = 'En proceso';
        break;
      case 'ESPERANDO_DECISION':
        bg = const Color(0xFFEDE7F6);
        fg = const Color(0xFF5E35B1);
        label = 'Esperando decisión';
        break;
      case 'DEMORADO':
        bg = const Color(0xFFFFEBEE);
        fg = const Color(0xFFC62828);
        label = 'Demorado';
        break;
      case 'COMPLETADO':
        bg = const Color(0xFFE8F5E9);
        fg = const Color(0xFF2E7D32);
        label = 'Completado';
        break;
      case 'CANCELADO':
        bg = const Color(0xFFF5F5F5);
        fg = const Color(0xFF616161);
        label = 'Cancelado';
        break;
      default:
        bg = Colors.grey.shade200;
        fg = Colors.grey.shade800;
        label = estado;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: fg,
          fontWeight: FontWeight.w700,
          fontSize: 12,
        ),
      ),
    );
  }
}
