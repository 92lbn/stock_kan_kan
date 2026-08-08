---
name: test-strategy
description: Stratégie de test du projet (Vitest sur la logique pure, Playwright sur les parcours). À charger avant de modifier un calcul métier (heures, argent, food cost, ratios) ou d'ajouter une fonctionnalité critique. Règle centrale : aucun changement de calcul sans test qui l'accompagne.
---

# Stratégie de test

## Règle centrale

**Aucune modification d'un calcul métier sans un test Vitest qui l'accompagne.** Pour une
correction de bug : le test doit ÉCHOUER avant le fix et PASSER après (écris-le d'abord).

## Vitest — logique pure

Cible toute fonction pure, sans I/O :

- `src/lib/hours.ts` — `sumShiftHours`, `computeTotalHours` (créneaux passant minuit inclus :
  09:00→17:00 = 8h ; 18:00→02:00 = 8h ; 22:00→06:00 = 8h ; 12:00→12:00 = 0h).
- `src/lib/money.ts` — addition, multiplication, formatage `Decimal`.
- `src/lib/date.ts` — plages de mois/jour en Europe/Paris, avec un cas en heure d'été ET un en
  heure d'hiver (le bug classique du décalage d'un jour).
- Food cost %, PMP, ratio masse salariale, faisabilité de production (Phase 5).

Colocalise : `foo.test.ts` à côté de `foo.ts`, ou dans `src/lib/__tests__/`.

## Playwright — parcours critiques

4 parcours : login, mouvement de stock, création de créneau, saisie compta.

## CI

GitHub Action sur chaque PR : `lint` + typecheck (`tsc --noEmit`) + `test`.

## Notes d'implémentation

- Les tests de logique pure ne doivent PAS toucher la DB ni Next : garde les fonctions pures et
  testables (entrées → sortie déterministe). Si un calcul a besoin de la date « maintenant »,
  injecte-la en paramètre plutôt que d'appeler `new Date()` en interne.
- Pour les `Decimal` Prisma, teste via les helpers de `src/lib/money.ts`, pas en comparant des
  floats.
