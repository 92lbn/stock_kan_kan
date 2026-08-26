import 'package:flutter/material.dart';

import '../../data/models/alarm_model.dart';
import '../../data/repositories/alarm_repository.dart';
import '../../data/repositories/dhikr_repository.dart';
import '../../services/alarm_service.dart';
import 'alarm_ring_screen.dart';

/// Liste des alarmes : activer/désactiver, aperçu, et déclenchement de test.
class AlarmListScreen extends StatefulWidget {
  const AlarmListScreen({super.key});

  @override
  State<AlarmListScreen> createState() => _AlarmListScreenState();
}

class _AlarmListScreenState extends State<AlarmListScreen> {
  final _repo = AlarmRepository();
  final _dhikrRepo = DhikrRepository();
  List<AlarmEntry> _alarms = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final a = await _repo.all();
    if (mounted) setState(() => _alarms = a);
  }

  Future<void> _toggle(AlarmEntry a, bool value) async {
    await _repo.setEnabled(a.id, value);
    final updated = a.copyWith(enabled: value);
    await AlarmService.instance.schedule(updated);
    await _load();
  }

  static const _weekLabels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Réveil Adhkar')),
      body: _alarms.isEmpty
          ? const Center(child: Text('Aucune alarme. Appuie sur + pour en créer une.'))
          : ListView.separated(
              itemCount: _alarms.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (_, i) {
                final a = _alarms[i];
                return ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  title: Text(
                    '${a.hour.toString().padLeft(2, '0')}:${a.minute.toString().padLeft(2, '0')}',
                    style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w700),
                  ),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (a.label.isNotEmpty) Text(a.label),
                      const SizedBox(height: 4),
                      Text(
                        a.isRecurring
                            ? [for (var d = 1; d <= 7; d++) if (a.weekdays.contains(d)) _weekLabels[d - 1]].join(' ')
                            : 'Une seule fois',
                        style: const TextStyle(fontSize: 12),
                      ),
                    ],
                  ),
                  trailing: Switch(
                    value: a.enabled,
                    onChanged: (v) => _toggle(a, v),
                  ),
                  onLongPress: () => _previewChallenge(a),
                );
              },
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _createDemo,
        icon: const Icon(Icons.add_alarm),
        label: const Text('Nouvelle'),
      ),
    );
  }

  /// Aperçu manuel de l'écran de défi (test sans attendre l'heure).
  Future<void> _previewChallenge(AlarmEntry a) async {
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => AlarmRingScreen(alarm: a)),
    );
  }

  /// Démo : crée une alarme à +1 min avec la 1re invocation, tous les jours.
  Future<void> _createDemo() async {
    final dhikrs = await _dhikrRepo.all();
    if (dhikrs.isEmpty) return;
    final now = DateTime.now().add(const Duration(minutes: 1));
    final entry = AlarmEntry(
      id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
      hour: now.hour,
      minute: now.minute,
      enabled: true,
      label: 'Réveil du Fajr',
      dhikrId: dhikrs.first.id,
      weekdays: {1, 2, 3, 4, 5, 6, 7},
    );
    await _repo.upsert(entry);
    await AlarmService.instance.schedule(entry);
    await _load();
  }
}
