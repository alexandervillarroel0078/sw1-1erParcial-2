import 'package:flutter/material.dart';

import '../models/tramite.dart';
import 'estado_badge.dart';

/// Tarjeta de trámite para el listado del cliente.
class TramiteCard extends StatelessWidget {
  const TramiteCard({
    super.key,
    required this.tramite,
    required this.onTap,
  });

  final Tramite tramite;
  final VoidCallback onTap;

  String _fechaTexto() {
    final d = tramite.creadoEn;
    if (d == null) return '—';
    final l = d.toLocal();
    return '${l.day.toString().padLeft(2, '0')}/${l.month.toString().padLeft(2, '0')}/${l.year}';
  }

  String _progresoTexto() {
    final x = tramite.pasoActual ?? 0;
    final y = tramite.totalPasos ?? 0;
    if (y <= 0) return 'Progreso: —';
    return 'Paso $x de $y';
  }

  @override
  Widget build(BuildContext context) {
    final nombrePolitica =
        (tramite.politicaNombre ?? 'Política').trim().isEmpty
            ? 'Política'
            : tramite.politicaNombre!.trim();

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                nombrePolitica,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  EstadoBadge(estado: tramite.estado),
                  const Spacer(),
                  Text(
                    _fechaTexto(),
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                _progresoTexto(),
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
