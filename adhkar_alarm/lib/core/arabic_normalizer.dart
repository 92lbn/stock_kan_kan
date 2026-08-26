/// Normalisation du texte arabe pour une comparaison tolérante.
///
/// Le matin, la prononciation est imparfaite et le STT rend rarement les
/// harakat (voyelles courtes) de façon fiable. On ramène donc la référence
/// ET la transcription à une forme canonique avant de les comparer :
///
///  1. suppression des tashkeel/harakat (fatha, damma, kasra, sukun, shadda,
///     tanwin, dagger alif…) ;
///  2. suppression du tatweel (ـ) et des marques coraniques ;
///  3. normalisation des alifs (أ إ آ ٱ → ا) ;
///  4. normalisation des hamzas (ؤ → و, ئ → ي, ء supprimé) ;
///  5. ta marbuta (ة → ه) et alif maqsura (ى → ي) ;
///  6. suppression de la ponctuation, des tatweels et compactage des espaces.
class ArabicNormalizer {
  ArabicNormalizer._();

  // Harakat, tanwin, shadda, sukun, dagger alif, hamza flottante, etc.
  // Plage U+064B..U+0652 + U+0670 (dagger alif) + U+0640 (tatweel)
  // + marques coraniques U+06D6..U+06ED.
  static final RegExp _diacritics = RegExp(
    r'[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۨ-ۭ࣓-ࣿ]',
  );
  static final RegExp _tatweel = RegExp('ـ');
  static final RegExp _nonArabicLetters = RegExp(r'[^ء-ي\s]');
  static final RegExp _spaces = RegExp(r'\s+');

  static const Map<String, String> _letterFolding = {
    // Alifs
    'أ': 'ا', // أ
    'إ': 'ا', // إ
    'آ': 'ا', // آ
    'ٱ': 'ا', // ٱ (alif wasla)
    // Hamzas portées
    'ؤ': 'و', // ؤ -> و
    'ئ': 'ي', // ئ -> ي
    'ء': '', // ء (hamza isolée) supprimée
    // Ta marbuta / alif maqsura
    'ة': 'ه', // ة -> ه
    'ى': 'ي', // ى -> ي
  };

  /// Retourne la forme canonique d'un texte arabe.
  static String normalize(String input) {
    if (input.isEmpty) return '';
    var s = input;
    s = s.replaceAll(_diacritics, '');
    s = s.replaceAll(_tatweel, '');

    final buffer = StringBuffer();
    for (final ch in s.split('')) {
      buffer.write(_letterFolding[ch] ?? ch);
    }
    s = buffer.toString();

    // Enlève ce qui n'est ni lettre arabe ni espace (chiffres, ponctuation…)
    s = s.replaceAll(_nonArabicLetters, ' ');
    s = s.replaceAll(_spaces, ' ').trim();
    return s;
  }

  /// Découpe en mots normalisés (utile pour le surlignage mot à mot).
  static List<String> tokenize(String input) {
    final n = normalize(input);
    if (n.isEmpty) return const [];
    return n.split(' ');
  }
}
