<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version (Next 16.2) has breaking changes — APIs, conventions, and file structure may all
differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before
writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# stock_kan_kan — outil interne de gestion de restaurant

App interne utilisée ~30 fois/jour par une équipe, souvent sur mobile, debout en cuisine.

**Stack :** Next.js 16.2 (App Router), React 19.2, Prisma 7 + `@prisma/adapter-pg`, Supabase
Postgres (eu-west-1), Tailwind 4, auth maison JWT/`jose`, PWA + Web Push. Déployée sur Vercel
en région `dub1` avec Fluid Compute activé.

## Skills projet — à consulter selon le contexte

Les skills détaillés vivent dans `.claude/skills/`. Charge le skill correspondant AVANT d'écrire
le code concerné :

| Skill | Quand |
| --- | --- |
| `nextjs16` | Toute API Next : routing, Server Actions, Suspense, caching, PPR, proxy, metadata. |
| `server-action-security` | Tout fichier de `src/lib/actions/` ou `src/app/api/`. |
| `prisma-supabase` | Migration, edit de `schema.prisma`, seed/import, requête coûteuse. |
| `restaurant-domain` | Calculs métier : food cost, PMP, démarque, masse salariale, HACCP, heures. |
| `perf-budget` | Ajout de dépendance, page qui requête la base, composant client, streaming. |
| `a11y-fr` | Composant UI, formulaire, navigation, couleurs/contraste. |
| `test-strategy` | Modification d'un calcul métier, fonctionnalité critique. |

## Règles non négociables

1. **Doc d'abord.** Avant d'utiliser une API Next, lis son guide dans
   `node_modules/next/dist/docs/`. Ne devine jamais une signature ou un flag de cette version.
2. **Sécurité des server actions.** Garde d'auth en première ligne, validation Zod de tous les
   inputs, scoping par `userId`, jamais confiance à un ID client, `revalidatePath` de toutes les
   routes impactées, retour d'erreur typé (`{ error: string } | undefined`), jamais de `throw` nu.
3. **Argent et quantités en `Decimal`**, jamais en `Float`. Tout calcul monétaire passe par
   `src/lib/money.ts`. Toutes les dates passent par `src/lib/date.ts` (Europe/Paris).
4. **Deux connexions Supabase :** `DATABASE_URL` (transaction pooler, 6543, runtime) et
   `DIRECT_URL` (session pooler, 5432, CLI/migrations/seed). Ne jamais éditer une migration
   appliquée. Index sur toute colonne filtrée ou triée.
5. **Perf = vagues de requêtes séquentielles.** Max 2 vagues par page, requêtes indépendantes en
   `Promise.all`, `getCurrentUser` mis en cache. JS initial < 120 kB gzip, aucune dépendance
   > 30 kB sans justification.
6. **Accessibilité :** contraste AA, cibles 44×44 px, focus visible partout, `aria-current` sur
   la nav active, jamais la couleur seule, tout en français.
7. **Tests :** aucun changement d'un calcul métier sans test Vitest (échoue avant, passe après).

## Conventions de travail

- Une phase du plan par session, un commit à la fin de chacune.
- La fonctionnalité de **pointage est temporairement retirée de la navigation** : ne pas y
  travailler, mais ne pas supprimer le code existant (marqué `[EN ATTENTE]` dans le plan).
