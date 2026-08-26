import '../data/models/dhikr_model.dart';

/// Liste prédéfinie d'invocations du réveil (Adhkar al-Istiyqadh) et du matin.
/// Texte arabe, translittération, traduction FR et audio de référence.
const List<Dhikr> seedAdhkar = [
  Dhikr(
    id: 1,
    arabic:
        'الحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ',
    transliteration:
        'Al-hamdu lillâhi alladhî ahyânâ ba\'da mâ amâtanâ wa ilayhi n-nushûr',
    translationFr:
        'Louange à Allah qui nous a rendus à la vie après nous avoir fait mourir '
        '(dormir), et c\'est vers Lui qu\'aura lieu la résurrection.',
    audioAsset: 'assets/audio/istiyqadh.mp3',
    source: 'Al-Bukhârî',
  ),
  Dhikr(
    id: 2,
    arabic:
        'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ لَهُ المُلْكُ وَلَهُ الحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    transliteration:
        'Lâ ilâha illâ Llâhu wahdahu lâ sharîka lah, lahu l-mulku wa lahu l-hamd, '
        'wa huwa \'alâ kulli shay\'in qadîr',
    translationFr:
        'Il n\'y a de divinité digne d\'adoration qu\'Allah, Unique, sans associé. '
        'À Lui la royauté, à Lui la louange, et Il est Omnipotent.',
    audioAsset: 'assets/audio/tahlil.mp3',
    source: 'Al-Bukhârî & Muslim',
  ),
  Dhikr(
    id: 3,
    arabic:
        'أَصْبَحْنَا وَأَصْبَحَ المُلْكُ لِلَّهِ وَالحَمْدُ لِلَّهِ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ',
    transliteration:
        'Asbahnâ wa asbaha l-mulku lillâh, wa l-hamdu lillâh, lâ ilâha illâ Llâhu '
        'wahdahu lâ sharîka lah',
    translationFr:
        'Nous voici au matin et le règne appartient à Allah. Louange à Allah. '
        'Nulle divinité si ce n\'est Allah, Unique, sans associé.',
    audioAsset: 'assets/audio/asbahna.mp3',
    source: 'Muslim',
  ),
];
