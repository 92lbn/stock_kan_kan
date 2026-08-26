import '../core/arabic_normalizer.dart';
import 'levenshtein.dart';

/// Résultat d'une comparaison entre la transcription vocale et la référence.
class MatchResult {
  const MatchResult({
    required this.similarity,
    required this.wordMatched,
    required this.matchedCount,
    required this.passed,
  });

  /// Similarité globale [0..1] sur le texte entier normalisé.
  final double similarity;

  /// Un booléen par mot de la référence : true = mot reconnu (à surligner
  /// en vert dans l'UI).
  final List<bool> wordMatched;

  /// Nombre de mots reconnus.
  final int matchedCount;

  /// Vrai si le seuil de déblocage est atteint.
  final bool passed;

  double get progress =>
      wordMatched.isEmpty ? 0 : matchedCount / wordMatched.length;
}

/// Compare une invocation de référence à la transcription vocale live.
///
/// Deux niveaux :
///  - global : similarité de Levenshtein sur tout le texte normalisé,
///    comparée au [threshold] (0.8 par défaut) — c'est ce qui débloque.
///  - mot à mot : chaque mot de la référence est cherché dans la
///    transcription avec une tolérance locale, pour le surlignage vert.
class DhikrMatcher {
  DhikrMatcher({
    this.threshold = 0.8,
    this.wordThreshold = 0.72,
  });

  /// Seuil de similarité globale pour valider (0.8 = 80 %).
  final double threshold;

  /// Seuil de similarité par mot pour l'allumer en vert.
  final double wordThreshold;

  MatchResult evaluate({
    required String reference,
    required String transcript,
  }) {
    final refWords = ArabicNormalizer.tokenize(reference);
    final saidWords = ArabicNormalizer.tokenize(transcript);

    // --- Score global ---
    final refJoined = refWords.join(' ');
    final saidJoined = saidWords.join(' ');
    final globalSim = Levenshtein.similarity(refJoined, saidJoined);

    // --- Surlignage mot à mot ---
    // Chaque mot de référence est apparié au meilleur mot encore
    // disponible de la transcription (appariement glouton gauche→droite
    // pour respecter l'ordre naturel de récitation).
    final matched = List<bool>.filled(refWords.length, false);
    final used = List<bool>.filled(saidWords.length, false);
    var matchedCount = 0;

    for (var i = 0; i < refWords.length; i++) {
      final ref = refWords[i];
      var bestJ = -1;
      var bestSim = 0.0;
      for (var j = 0; j < saidWords.length; j++) {
        if (used[j]) continue;
        final sim = Levenshtein.similarity(ref, saidWords[j]);
        if (sim > bestSim) {
          bestSim = sim;
          bestJ = j;
        }
      }
      if (bestJ >= 0 && bestSim >= wordThreshold) {
        matched[i] = true;
        used[bestJ] = true;
        matchedCount++;
      }
    }

    // On débloque si le score global atteint le seuil OU si la quasi-totalité
    // des mots sont reconnus (robuste aux mots parasites du STT).
    final ratio = refWords.isEmpty ? 0.0 : matchedCount / refWords.length;
    final passed = globalSim >= threshold || ratio >= threshold;

    return MatchResult(
      similarity: globalSim,
      wordMatched: matched,
      matchedCount: matchedCount,
      passed: passed,
    );
  }
}
