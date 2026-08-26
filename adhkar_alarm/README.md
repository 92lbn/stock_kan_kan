# Réveil Adhkar — `adhkar_alarm`

Application mobile de réveil (Flutter, iOS + Android). L'alarme ne s'arrête que
lorsque l'utilisateur **récite correctement à voix haute** l'invocation du réveil
(Adhkar al-Istiyqadh / Adhkar as-Sabah).

## Pourquoi Flutter

Cross-platform iOS + Android à partir d'une base unique, avec un écosystème mûr
sur les 3 briques critiques : alarme fiable en arrière-plan (`alarm`),
reconnaissance vocale native on-device (`speech_to_text`, ar-SA), stockage local
(`sqflite`).

## Arborescence

```
adhkar_alarm/
├── pubspec.yaml
├── android/app/src/main/AndroidManifest.xml   # permissions alarme/micro/FSI
├── lib/
│   ├── main.dart                     # init AlarmService + navigatorKey global
│   ├── core/
│   │   └── arabic_normalizer.dart     # normalisation arabe (harakat, hamzas, alifs)
│   ├── logic/
│   │   ├── levenshtein.dart           # distance + similarité [0..1]
│   │   └── dhikr_matcher.dart         # score global + surlignage mot à mot
│   ├── services/
│   │   ├── alarm_service.dart         # alarme background, FullScreenIntent, reschedule
│   │   └── speech_service.dart        # STT natif ar-SA, écoute continue, on-device
│   ├── data/
│   │   ├── models/{alarm_model,dhikr_model}.dart
│   │   ├── db/database.dart           # SQLite + schéma + seed
│   │   └── repositories/{alarm,dhikr}_repository.dart
│   ├── seed/adhkar_seed.dart          # invocations : arabe, translit, FR, audio
│   └── ui/
│       ├── screens/{alarm_list,alarm_ring}_screen.dart
│       └── widgets/highlighted_dhikr_text.dart   # mots verts en temps réel
└── test/dhikr_matcher_test.dart
```

## Les 4 livrables

1. **Arborescence** : ci-dessus.
2. **Service d'alarme background** : `lib/services/alarm_service.dart`
   (+ permissions dans le manifest). Réveil exact, sonnerie en boucle, volume
   forcé même en silencieux, FullScreenIntent, relance au reboot, avance
   automatique à l'occurrence suivante après validation.
3. **STT + comparaison** : `lib/services/speech_service.dart`,
   `lib/logic/dhikr_matcher.dart`, `lib/core/arabic_normalizer.dart`
   (normalisation : suppression des harakat, hamzas/alifs unifiés, ta marbuta →
   ha ; comparaison tolérante Levenshtein, seuil 80 %).
4. **UI d'alarme active** : `lib/ui/screens/alarm_ring_screen.dart` +
   `highlighted_dhikr_text.dart` — mots reconnus qui s'allument en vert en
   direct, barre de progression, micro, et **fail-safe** (saisie manuelle après
   plusieurs cycles bloqués ou si le moteur arabe est absent).

## Logique de déblocage

- Écoute continue en arabe (ar-SA), résultats partiels en temps réel.
- Chaque transcription est normalisée puis comparée à la référence :
  - **score global** Levenshtein ≥ 0.8 → validation ;
  - **appariement mot à mot** (seuil 0.72) → surlignage vert.
- À la validation : arrêt de la sonnerie, avance récurrente/désactivation
  ponctuelle, écran de confirmation.
- Jamais la couleur seule : le mot reconnu passe aussi en gras + ✓ (a11y).

## Lancer

```bash
cd adhkar_alarm
flutter pub get
flutter test          # valide le matcher (normalisation + tolérance 80 %)
flutter run
```

> Ajouter les assets audio dans `assets/audio/` (sonnerie + prononciations de
> référence) et les icônes de notification. Sur iOS, activer l'entitlement
> **Critical Alerts** (demande à Apple) et `NSMicrophoneUsageDescription` +
> `NSSpeechRecognitionUsageDescription` dans `Info.plist`. Sur Android 14+,
> guider l'utilisateur vers l'autorisation « Alarmes et rappels ».
