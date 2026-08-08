---
name: restaurant-domain
description: Vocabulaire et règles métier de la gestion de restaurant. À charger avant tout calcul ou fonctionnalité touchant food cost, coût matière, PMP, démarque, masse salariale, HACCP/DLC, ou heures de travail françaises. Fixe les formules et les cibles chiffrées de référence.
---

# Domaine métier — restaurant

## Coûts & rentabilité

- **Coût matière (food cost €)** = somme(quantité ingrédient × coût unitaire) d'un plat.
- **Food cost %** = coût matière / prix de vente HT. **Cible 25–32 %.** > 35 % = plat à revoir.
- **PMP / CUMP (prix moyen pondéré)** = valeur du stock / quantité en stock, recalculé à
  chaque entrée : `nouveauPMP = (stockValeur + qtéEntrée × prixEntrée) / (stockQté + qtéEntrée)`.
  C'est la base de la valorisation du stock (combien d'€ dorment en réserve).
- **Démarque / perte** = écart entre stock théorique et stock réel (casse, vol, péremption),
  enregistré en `StockMovement` de type `ADJUSTMENT`. Taux de perte = perte / consommation.
- **Menu engineering** : matrice popularité (volume vendu) × marge (prix − coût matière).
  4 cadrans : Star (haute/haute), Plowhorse (populaire/peu rentable), Puzzle (rentable/peu vendu),
  Dog (basse/basse).

## Masse salariale

- **Ratio masse salariale / CA** = coût du personnel / chiffre d'affaires. **Cible ~30 %.**
  Le KPI le plus important pour un patron. Alerte quand un service dépasse la cible.
- Coût d'un créneau planifié = heures × taux horaire (`User.hourlyRate`).

## Heures françaises (pour la paye — [EN ATTENTE avec le pointage])

- Base légale 35 h/semaine. **Heures sup : +25 %** de la 36e à la 43e heure, **+50 %** au-delà de 43 h.
- **Majorations** : dimanche, nuit, jours fériés (taux selon convention). Déduction des pauses.
- Calcul hebdomadaire, pas mensuel. Verrouillage mensuel avant export paye.

## Hygiène / légal (France)

- **HACCP** : relevés de température frigos 2×/jour, alerte hors plage. Plan de nettoyage signé.
  Registre des huiles de friture.
- **DLC** (date limite de consommation, produits frais) vs **DLUO/DDM** (durabilité minimale).
  Suivi par lot (`StockLot`), alerte à J-3 de la DLC.
- **Allergènes** : obligation légale d'affichage. Portés par le `StockItem`, remontés sur la
  fiche technique de chaque recette.

## Service

Découpage **midi / soir**. Les services du soir passent souvent minuit (créneaux 18:00→02:00) :
tout calcul d'heures doit gérer le passage de minuit (voir `src/lib/hours.ts`).
