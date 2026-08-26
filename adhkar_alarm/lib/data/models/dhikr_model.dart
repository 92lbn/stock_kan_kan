/// Une invocation (dhikr) avec son texte arabe, sa translittération, sa
/// traduction française et le chemin de l'audio de prononciation de référence.
class Dhikr {
  const Dhikr({
    required this.id,
    required this.arabic,
    required this.transliteration,
    required this.translationFr,
    this.audioAsset,
    this.source,
  });

  final int id;

  /// Texte arabe complet, avec harakat (affiché tel quel à l'écran).
  final String arabic;

  /// Translittération latine (aide à la lecture).
  final String transliteration;

  /// Traduction française.
  final String translationFr;

  /// Chemin de l'asset audio de prononciation, ex. `assets/audio/istiyqadh.mp3`.
  final String? audioAsset;

  /// Référence (hadith / recueil).
  final String? source;

  factory Dhikr.fromMap(Map<String, Object?> m) => Dhikr(
        id: m['id'] as int,
        arabic: m['arabic'] as String,
        transliteration: m['transliteration'] as String,
        translationFr: m['translation_fr'] as String,
        audioAsset: m['audio_asset'] as String?,
        source: m['source'] as String?,
      );

  Map<String, Object?> toMap() => {
        'id': id,
        'arabic': arabic,
        'transliteration': transliteration,
        'translation_fr': translationFr,
        'audio_asset': audioAsset,
        'source': source,
      };
}
