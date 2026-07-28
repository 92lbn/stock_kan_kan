---
name: perf-budget
description: Budgets de performance chiffrés de l'app. À charger avant d'ajouter une dépendance, une page qui requête la base, un composant client lourd, ou de toucher au streaming/Suspense. Fixe les seuils JS/LCP/transition et la règle des vagues de requêtes séquentielles.
---

# Budget de performance

Contexte : latence réseau déjà réglée (Vercel dub1 + Supabase eu-west-1 + Fluid Compute,
instances chaudes). Le coût restant est ARCHITECTURAL. Ne propose jamais de changer de région
ou d'hébergeur.

## Budgets chiffrés

- **JS initial < 120 kB gzip.** Mesure avec `next build` (colonne First Load JS).
- **LCP < 1,2 s en 4G.**
- **Transition d'onglet perçue < 150 ms.**
- **Aucune dépendance > 30 kB** ajoutée sans justification écrite. Préfère une implémentation
  maison à une lib lourde (ex. calendrier CSS Grid vs @fullcalendar ~250-300 kB ; graphe SVG
  maison vs une lib de charts).

## La règle qui compte le plus : vagues de requêtes SÉQUENTIELLES

Ce qui coûte, ce n'est PAS le volume de données, c'est le nombre de VAGUES de requêtes en série
par rendu. Chaque vague = un aller-retour DB avant de pouvoir lancer la suivante.

- **Objectif : max 2 vagues séquentielles par page.**
- `getCurrentUser()` doit être mis en cache par React `cache` pour ne pas ajouter une vague à
  chaque appel dans un même rendu.
- Dans une page, lance toutes les requêtes indépendantes en `Promise.all`, jamais en cascade.
- Une garde d'auth qui touche la DB (ex. vérif `sessionVersion`) doit être `cache`-ée pour ne
  pas devenir une vague supplémentaire.

## Requêtes

- Agrège en SQL (`count`, `groupBy`, `_sum`) plutôt que charger tout et calculer en JS.
- Pagination sur les listes longues (`/stock`, entrées compta).
- Ne `findMany` jamais un dataset entier juste pour en compter une partie.

## Streaming

- Pas de `loading.tsx` global qui affiche un faux squelette et coupe le prefetch.
- Chaque bloc qui requête → `<Suspense>` avec un squelette de la VRAIE forme du contenu.
- PPR (via `cacheComponents`) : shell statique instantané, seules les données streament.

## UI perçue

- `useOptimistic` sur les mutations fréquentes (notes, mouvements de stock, suppression créneaux).
- `useLinkStatus` + `router.prefetch` au `onTouchStart` pour un feedback de nav immédiat.
- Service worker : app-shell en stale-while-revalidate, lecture offline, Background Sync.
