---
name: prisma-supabase
description: Règles Prisma 7 + Supabase Postgres (eu-west-1). À charger avant toute migration, edit de schema.prisma, script de seed/import, ou requête coûteuse. Couvre les deux chaînes de connexion (pooler transaction vs session), les types Decimal monétaires, les index, et l'interdiction d'éditer une migration appliquée.
---

# Prisma 7 + Supabase

## Deux chaînes de connexion DISTINCTES — ne pas confondre

- **`DATABASE_URL`** = Supavisor **transaction pooler**, port **6543**, avec
  `?pgbouncer=true&connection_limit=5`. C'est la connexion du RUNTIME (`src/lib/db.ts`).
  Le mode transaction ne supporte NI prepared statements NI DDL. `connection_limit=5` (pas 1) :
  Fluid Compute réutilise les instances, une limite à 1 est un goulot sous concurrence.
- **`DIRECT_URL`** = **session pooler**, port **5432**. C'est la connexion du CLI Prisma :
  migrations, `prisma db push`, `prisma studio`, `prisma/seed.ts`, `prisma/import-inventory.ts`,
  `prisma.config.ts`. Le DDL et les prepared statements y passent.

Toujours documenter les deux dans `.env.example`.

## Migrations

- **Ne JAMAIS éditer une migration déjà appliquée.** Crée une nouvelle migration.
- Relis toujours le SQL généré avant de committer (`prisma/migrations/*/migration.sql`).
- Une migration qui change un type de colonne avec des données existantes doit être vérifiée
  (cast explicite, pas de perte).

## Types

- **Argent → `Decimal @db.Decimal(12,2)`.** Jamais de `Float` pour un montant. Concerné :
  `LedgerEntry.amount`, `User.hourlyRate`, tout prix/coût futur.
- **Quantités de stock → `Decimal @db.Decimal(12,3)`** (`StockItem.quantity`, `minThreshold`,
  `StockMovement.quantity`) : 3 décimales pour les kg/L.
- Prisma retourne les `Decimal` comme objets `Prisma.Decimal` — ne jamais les mélanger avec des
  `Number` bruts. Passe par `src/lib/money.ts`.

## Index

- **Index systématique** sur toute colonne servant à filtrer (`where`) ou trier (`orderBy`).
  Vérifie qu'un `@@index` existe avant d'ajouter une requête sur une nouvelle colonne.

## Requêtes

- Préfère les agrégations SQL (`count`, `groupBy`, `aggregate`, `_sum`) à un `findMany` suivi
  d'un calcul en JS. Pour `quantity <= minThreshold` (comparaison inter-colonnes), `$queryRaw`
  ou une colonne générée.
- Écritures liées dans `db.$transaction`. Voir aussi `server-action-security`.

## Sécurité

Les tables Prisma sont dans le schéma `public`, exposé par l'API PostgREST de Supabase, sans
RLS (Prisma la désactive). À traiter en Phase 2 : schéma dédié ou RLS activée sur toutes les tables.
