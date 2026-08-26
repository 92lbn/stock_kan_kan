/// Modèle d'alarme, récurrente (jours de la semaine) ou ponctuelle.
class AlarmEntry {
  const AlarmEntry({
    required this.id,
    required this.hour,
    required this.minute,
    required this.enabled,
    required this.label,
    required this.dhikrId,
    required this.weekdays,
    this.ringtoneAsset = 'assets/audio/ringtone.mp3',
  });

  /// Sert aussi d'identifiant natif pour le plugin `alarm`.
  final int id;

  final int hour; // 0..23
  final int minute; // 0..59
  final bool enabled;
  final String label;

  /// L'invocation à réciter pour arrêter cette alarme.
  final int dhikrId;

  /// Jours actifs : 1 = lundi … 7 = dimanche (ISO-8601).
  /// Vide = alarme ponctuelle (sonne une seule fois puis se désactive).
  final Set<int> weekdays;

  final String ringtoneAsset;

  bool get isRecurring => weekdays.isNotEmpty;

  AlarmEntry copyWith({
    bool? enabled,
    int? hour,
    int? minute,
    String? label,
    int? dhikrId,
    Set<int>? weekdays,
  }) =>
      AlarmEntry(
        id: id,
        hour: hour ?? this.hour,
        minute: minute ?? this.minute,
        enabled: enabled ?? this.enabled,
        label: label ?? this.label,
        dhikrId: dhikrId ?? this.dhikrId,
        weekdays: weekdays ?? this.weekdays,
        ringtoneAsset: ringtoneAsset,
      );

  factory AlarmEntry.fromMap(Map<String, Object?> m) => AlarmEntry(
        id: m['id'] as int,
        hour: m['hour'] as int,
        minute: m['minute'] as int,
        enabled: (m['enabled'] as int) == 1,
        label: m['label'] as String,
        dhikrId: m['dhikr_id'] as int,
        weekdays: (m['weekdays'] as String)
            .split(',')
            .where((s) => s.isNotEmpty)
            .map(int.parse)
            .toSet(),
        ringtoneAsset: m['ringtone_asset'] as String? ??
            'assets/audio/ringtone.mp3',
      );

  Map<String, Object?> toMap() => {
        'id': id,
        'hour': hour,
        'minute': minute,
        'enabled': enabled ? 1 : 0,
        'label': label,
        'dhikr_id': dhikrId,
        'weekdays': weekdays.toList()..sort(),
        'ringtone_asset': ringtoneAsset,
      }..['weekdays'] = (weekdays.toList()..sort()).join(',');
}
