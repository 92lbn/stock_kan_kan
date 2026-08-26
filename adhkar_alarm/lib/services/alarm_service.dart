import 'dart:async';

import 'package:alarm/alarm.dart';
import 'package:flutter/material.dart';

import '../data/models/alarm_model.dart';
import '../data/repositories/alarm_repository.dart';
import '../ui/screens/alarm_ring_screen.dart';

/// Service d'alarme d'arrière-plan.
///
/// S'appuie sur le plugin `alarm`, qui gère côté natif :
///  - un réveil EXACT (AlarmManager `setExactAndAllowWhileIdle` sur Android,
///    notification programmée + audio background sur iOS) ;
///  - un foreground service Android tant que l'alarme sonne ;
///  - le contournement du mode silencieux / Ne pas déranger (volume forcé,
///    `volumeSettings` + `AudioManager` en STREAM_ALARM) ;
///  - la relance des alarmes après un redémarrage (`RECEIVE_BOOT_COMPLETED`) ;
///  - un FullScreenIntent : l'appareil verrouillé affiche directement l'écran
///    de défi.
///
/// Ce service fait le pont entre nos [AlarmEntry] (persistés en SQLite) et les
/// `AlarmSettings` natifs, et écoute le déclenchement pour ouvrir la
/// « Mission Adhkar ».
class AlarmService {
  AlarmService._();
  static final AlarmService instance = AlarmService._();

  final _repo = AlarmRepository();
  StreamSubscription<AlarmSettings>? _ringSub;

  /// Clé de navigation globale : permet d'ouvrir l'écran de défi depuis un
  /// callback background, sans BuildContext local.
  static final navigatorKey = GlobalKey<NavigatorState>();

  /// À appeler une seule fois au démarrage de l'app (avant runApp l'init du
  /// plugin, puis ici la mise en écoute).
  Future<void> init() async {
    await Alarm.init();

    // Écoute le déclenchement : ouvre immédiatement l'écran « Mission Adhkar ».
    _ringSub ??= Alarm.ringStream.stream.listen(_onAlarmRing);

    // Reprogramme toutes les alarmes actives (utile après un reboot ou une
    // réinstallation : on resynchronise le natif avec notre base).
    await rescheduleAll();
  }

  Future<void> _onAlarmRing(AlarmSettings settings) async {
    final entry = await _repo.byId(settings.id);
    final nav = navigatorKey.currentState;
    if (nav == null || entry == null) return;

    // Ouvre l'écran de défi plein écran, non fermable par retour arrière.
    await nav.push(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => AlarmRingScreen(alarm: entry),
      ),
    );
  }

  /// Programme (ou reprogramme) une alarme au prochain créneau valide.
  Future<void> schedule(AlarmEntry entry) async {
    if (!entry.enabled) {
      await cancel(entry.id);
      return;
    }
    final next = _nextOccurrence(entry);
    final settings = AlarmSettings(
      id: entry.id,
      dateTime: next,
      assetAudioPath: entry.ringtoneAsset,
      loopAudio: true, // sonnerie en boucle
      vibrate: true,
      warningNotificationOnKill: true,
      androidFullScreenIntent: true, // ouvre l'écran même verrouillé
      volumeSettings: VolumeSettings.fade(
        volume: 1.0, // force le volume maximal
        fadeDuration: const Duration(seconds: 3),
        volumeEnforced: true, // rétablit le volume si l'utilisateur le baisse
      ),
      notificationSettings: const NotificationSettings(
        title: 'Mission Adhkar',
        body: 'Récite l\'invocation du réveil pour arrêter l\'alarme.',
        stopButton: null, // pas de bouton "Stop" : on doit réciter
        icon: 'notification_icon',
      ),
    );
    await Alarm.set(alarmSettings: settings);
  }

  /// Arrête la sonnerie en cours (appelé quand la récitation est validée).
  /// Reprogramme automatiquement l'occurrence suivante si l'alarme est
  /// récurrente ; désactive l'alarme ponctuelle.
  Future<void> stopAndAdvance(AlarmEntry entry) async {
    await Alarm.stop(entry.id);
    if (entry.isRecurring) {
      await schedule(entry); // prochain jour actif
    } else {
      await _repo.setEnabled(entry.id, false);
    }
  }

  /// Baisse le volume sans couper (option "fail-safe" douce pendant la saisie).
  Future<void> lowerVolume() async {
    // Le plugin ne pilote pas le volume à chaud : on rejoue avec fade bas.
    // En pratique on préfère stopAndAdvance dès validation. Placeholder
    // d'intention pour le mode secours.
  }

  Future<void> cancel(int id) => Alarm.stop(id);

  Future<void> rescheduleAll() async {
    final alarms = await _repo.all();
    for (final a in alarms) {
      if (a.enabled) {
        await schedule(a);
      }
    }
  }

  /// Calcule la prochaine date de déclenchement.
  ///  - ponctuelle : aujourd'hui si l'heure n'est pas passée, sinon demain ;
  ///  - récurrente : prochain jour de la semaine actif (ISO 1..7).
  DateTime _nextOccurrence(AlarmEntry entry) {
    final now = DateTime.now();
    var candidate = DateTime(
      now.year,
      now.month,
      now.day,
      entry.hour,
      entry.minute,
    );

    if (!entry.isRecurring) {
      if (!candidate.isAfter(now)) {
        candidate = candidate.add(const Duration(days: 1));
      }
      return candidate;
    }

    // Récurrente : avance jour par jour jusqu'à trouver un jour actif futur.
    for (var i = 0; i < 8; i++) {
      final day = candidate.add(Duration(days: i));
      if (entry.weekdays.contains(day.weekday) && day.isAfter(now)) {
        return DateTime(
          day.year,
          day.month,
          day.day,
          entry.hour,
          entry.minute,
        );
      }
    }
    // Filet de sécurité : dans une semaine.
    return candidate.add(const Duration(days: 7));
  }
}
