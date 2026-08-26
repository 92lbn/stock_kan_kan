import 'package:flutter/material.dart';

import '../../core/arabic_normalizer.dart';

/// Affiche le texte arabe de l'invocation, chaque mot s'allumant en vert
/// dès qu'il est reconnu. Rendu droite-à-gauche, gros caractères pour une
/// lecture au réveil.
class HighlightedDhikrText extends StatelessWidget {
  const HighlightedDhikrText({
    super.key,
    required this.arabic,
    required this.wordMatched,
  });

  /// Texte arabe original (avec harakat, tel qu'affiché).
  final String arabic;

  /// Un booléen par mot (aligné sur les mots affichés).
  final List<bool> wordMatched;

  @override
  Widget build(BuildContext context) {
    // On affiche les mots ORIGINAUX (avec harakat) mais l'alignement des
    // booléens suit le découpage par espaces, cohérent avec le tokenizer.
    final words = arabic.split(RegExp(r'\s+')).where((w) => w.isNotEmpty).toList();

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Wrap(
        alignment: WrapAlignment.center,
        spacing: 10,
        runSpacing: 14,
        children: [
          for (var i = 0; i < words.length; i++)
            _WordChip(
              text: words[i],
              matched: i < wordMatched.length && wordMatched[i],
            ),
        ],
      ),
    );
  }
}

class _WordChip extends StatelessWidget {
  const _WordChip({required this.text, required this.matched});

  final String text;
  final bool matched;

  @override
  Widget build(BuildContext context) {
    // Vert (reconnu) vs blanc (à réciter). On n'utilise jamais la couleur
    // seule : le mot reconnu passe aussi en gras + reçoit une puce ✓ visible.
    final color = matched ? const Color(0xFF16A34A) : Colors.white;
    return AnimatedDefaultTextStyle(
      duration: const Duration(milliseconds: 180),
      style: TextStyle(
        fontSize: 30,
        height: 1.9,
        color: color,
        fontWeight: matched ? FontWeight.w800 : FontWeight.w500,
      ),
      child: Semantics(
        label: matched ? 'Mot reconnu : $text' : 'À réciter : $text',
        child: Text(matched ? '$text ✓' : text),
      ),
    );
  }
}
