import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/utils/error_utils.dart';
import '../../shared/widgets/estado_badge.dart';
import '../models/tramite.dart';
import '../services/tramite_service.dart';

/// Detalle de un trámite: progreso y timeline de tareas.
class TramiteDetalleScreen extends StatefulWidget {
  const TramiteDetalleScreen({super.key, required this.id});

  final String id;

  @override
  State<TramiteDetalleScreen> createState() => _TramiteDetalleScreenState();
}

class _TramiteDetalleScreenState extends State<TramiteDetalleScreen> {
  late Future<TramiteDetalleResponse> _future;

  @override
  void initState() {
    super.initState();
    _future = context.read<TramiteService>().getDetalle(widget.id);
  }

  String _fmt(DateTime? d) {
    if (d == null) return '';
    final l = d.toLocal();
    return '${l.day.toString().padLeft(2, '0')}/${l.month.toString().padLeft(2, '0')}/${l.year} '
        '${l.hour.toString().padLeft(2, '0')}:${l.minute.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Detalle del trámite'),
      ),
      body: FutureBuilder<TramiteDetalleResponse>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  mensajeErrorAmigable(snap.error.toString()),
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ),
            );
          }
          final data = snap.data!;
          final t = data.tramite;
          final paso = t.pasoActual ?? 0;
          final total = (t.totalPasos ?? 0) > 0 ? t.totalPasos! : 1;
          final ratio = (paso / total).clamp(0.0, 1.0);

          return ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      (t.politicaNombre ?? 'Política').trim(),
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  EstadoBadge(estado: t.estado),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                'Paso $paso de $total',
                style: Theme.of(context).textTheme.titleSmall,
              ),
              const SizedBox(height: 8),
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: LinearProgressIndicator(
                  value: ratio,
                  minHeight: 10,
                ),
              ),
              const SizedBox(height: 28),
              Text(
                'Actividades',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
              ),
              const SizedBox(height: 12),
              ...data.tareas.map((tar) {
                final titulo =
                    (tar.actividadEtiqueta ?? 'Actividad').trim().isEmpty
                        ? 'Actividad'
                        : tar.actividadEtiqueta!.trim();
                final sub = tar.departamentoTexto?.trim();
                final fechaFin = tar.completadoEn;
                final fechaIni = tar.creadoEn;
                final st = tar.estado.toUpperCase();
                final estadoLinea = st == 'COMPLETADO'
                    ? '✅ ${_fmt(fechaFin ?? fechaIni)}'
                    : st == 'PENDIENTE'
                        ? '⬜ Pendiente'
                        : '⏳ En proceso';

                return Card(
                  margin: const EdgeInsets.only(bottom: 10),
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          titulo,
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 15,
                          ),
                        ),
                        if (sub != null && sub.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            sub,
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: Theme.of(context)
                                      .colorScheme
                                      .onSurfaceVariant,
                                ),
                          ),
                        ],
                        const SizedBox(height: 6),
                        Text(
                          estadoLinea,
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                );
              }),
            ],
          );
        },
      ),
    );
  }
}
