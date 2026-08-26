/// Distance de Levenshtein + similarité normalisée [0..1].
///
/// Implémentation en O(n·m) temps mais O(min(n,m)) mémoire (deux lignes
/// glissantes), suffisante pour des invocations de quelques dizaines de
/// caractères récitées mot à mot.
class Levenshtein {
  Levenshtein._();

  /// Distance d'édition entre deux chaînes (comparaison par code unit).
  static int distance(String a, String b) {
    if (identical(a, b)) return 0;
    if (a.isEmpty) return b.length;
    if (b.isEmpty) return a.length;

    // On itère sur la plus courte en colonnes pour minimiser la mémoire.
    if (a.length < b.length) {
      final tmp = a;
      a = b;
      b = tmp;
    }

    final prev = List<int>.generate(b.length + 1, (i) => i);
    final curr = List<int>.filled(b.length + 1, 0);

    for (var i = 1; i <= a.length; i++) {
      curr[0] = i;
      final ca = a.codeUnitAt(i - 1);
      for (var j = 1; j <= b.length; j++) {
        final cost = ca == b.codeUnitAt(j - 1) ? 0 : 1;
        final deletion = prev[j] + 1;
        final insertion = curr[j - 1] + 1;
        final substitution = prev[j - 1] + cost;
        var m = deletion < insertion ? deletion : insertion;
        if (substitution < m) m = substitution;
        curr[j] = m;
      }
      for (var j = 0; j <= b.length; j++) {
        prev[j] = curr[j];
      }
    }
    return prev[b.length];
  }

  /// Similarité normalisée : 1.0 = identique, 0.0 = tout différent.
  static double similarity(String a, String b) {
    if (a.isEmpty && b.isEmpty) return 1.0;
    final maxLen = a.length > b.length ? a.length : b.length;
    if (maxLen == 0) return 1.0;
    return 1.0 - distance(a, b) / maxLen;
  }
}
