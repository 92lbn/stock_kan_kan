import 'package:flutter_test/flutter_test.dart';

import 'package:adhkar_alarm/core/arabic_normalizer.dart';
import 'package:adhkar_alarm/logic/dhikr_matcher.dart';
import 'package:adhkar_alarm/logic/levenshtein.dart';

const _reference =
    'الحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ';

void main() {
  group('ArabicNormalizer', () {
    test('supprime les harakat', () {
      expect(ArabicNormalizer.normalize('الحَمْدُ'), 'الحمد');
    });

    test('normalise les alifs et hamzas', () {
      expect(ArabicNormalizer.normalize('أَحْيَانَا'), 'احيانا');
      expect(ArabicNormalizer.normalize('وَإِلَيْهِ'), 'واليه');
    });

    test('ta marbuta -> ha, alif maqsura -> ya', () {
      expect(ArabicNormalizer.normalize('صَلاة'), 'صلاه');
      expect(ArabicNormalizer.normalize('مَوْلَى'), 'مولي');
    });
  });

  group('Levenshtein', () {
    test('identique = 1.0', () {
      expect(Levenshtein.similarity('احمد', 'احمد'), 1.0);
    });
    test('une lettre de différence', () {
      expect(Levenshtein.distance('احمد', 'احمر'), 1);
    });
  });

  group('DhikrMatcher', () {
    final matcher = DhikrMatcher(threshold: 0.8);

    test('récitation exacte -> validée, tous les mots verts', () {
      final r = matcher.evaluate(reference: _reference, transcript: _reference);
      expect(r.passed, isTrue);
      expect(r.wordMatched.every((m) => m), isTrue);
    });

    test('récitation sans harakat -> toujours validée', () {
      const said =
          'الحمد لله الذي احيانا بعد ما اماتنا واليه النشور';
      final r = matcher.evaluate(reference: _reference, transcript: said);
      expect(r.passed, isTrue);
    });

    test('petites erreurs de prononciation -> tolérées (>=80%)', () {
      // "احيانا" mal entendu en "احياننا", un mot final approximatif.
      const said =
          'الحمد لله الذي احياننا بعد ما اماتنا واليه النشور';
      final r = matcher.evaluate(reference: _reference, transcript: said);
      expect(r.passed, isTrue);
    });

    test('récitation partielle -> non validée', () {
      const said = 'الحمد لله';
      final r = matcher.evaluate(reference: _reference, transcript: said);
      expect(r.passed, isFalse);
      expect(r.matchedCount, lessThan(r.wordMatched.length));
    });

    test('texte hors-sujet -> non validée', () {
      const said = 'مرحبا كيف حالك اليوم';
      final r = matcher.evaluate(reference: _reference, transcript: said);
      expect(r.passed, isFalse);
    });
  });
}
