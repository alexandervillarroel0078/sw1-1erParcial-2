import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../models/tramite.dart';
import '../services/tramite_service.dart';
import '../widgets/tramite_card.dart';

/// Lista de trámites del cliente.
class TramitesScreen extends StatefulWidget {
  const TramitesScreen({super.key});

  @override
  State<TramitesScreen> createState() => _TramitesScreenState();
}

class _TramitesScreenState extends State<TramitesScreen> {
  late Future<List<Tramite>> _future;

  @override
  void initState() {
    super.initState();
    _future = context.read<TramiteService>().getTramites();
  }

  void _reload() {
    setState(() {
      _future = context.read<TramiteService>().getTramites();
    });
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () async => _reload(),
      child: FutureBuilder<List<Tramite>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return ListView(
              children: const [
                SizedBox(height: 120),
                Center(child: CircularProgressIndicator()),
              ],
            );
          }
          if (snap.hasError) {
            return ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(24),
              children: [
                Text(
                  'No se pudieron cargar los trámites.\n${snap.error}',
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
                const SizedBox(height: 16),
                FilledButton.tonal(
                  onPressed: _reload,
                  child: const Text('Reintentar'),
                ),
              ],
            );
          }
          final list = snap.data ?? [];
          if (list.isEmpty) {
            return ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              children: const [
                SizedBox(height: 80),
                Center(child: Text('No tiene trámites registrados.')),
              ],
            );
          }
          return ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
            itemCount: list.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (context, i) {
              final t = list[i];
              return TramiteCard(
                tramite: t,
                onTap: () => context.push('/detalle/${t.id}'),
              );
            },
          );
        },
      ),
    );
  }
}
