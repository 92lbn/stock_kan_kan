# stock_kan_kan

Monorepo de deux applications internes de restaurant, en français et pensées pour un usage mobile en cuisine.

## Applications

- `apps/planning` — planning, pointage et administration des comptes. Port local `3000`.
- `apps/stock` — poste tablette partagé : pointage kiosk par PIN, inventaire par lots/DLC,
  sorties FEFO, mouvements et notes. Port local `3001`.
- `packages/db` — schéma Prisma, client généré et migrations pour une base Supabase unique.
- `packages/auth` — session JWT, gardes serveur et logique commune des proxies.
- `packages/lib` — dates Europe/Paris, Decimal, heures, FEFO, CSV et audit.
- `packages/ui` — composants et thème partagés.

Les comptes sont communs aux deux apps. Tous les employés accèdent à Planning. Stock exige le droit `canStock`; les administrateurs sont autorisés implicitement.

## Installation locale

Prérequis : Node 24, npm 10 et PostgreSQL.

1. Copier `.env.example` vers `.env` et remplacer toutes les valeurs d’exemple.
2. Installer et générer Prisma : `npm install`.
3. Appliquer les migrations sur la base locale : `npm run db:migrate`.
4. Créer le superadmin : `npm run db:seed`.
5. Lancer les deux apps : `npm run dev`.

Commandes de contrôle : `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` et `npm run e2e`.

## Connexions Supabase

- `DATABASE_URL` : Supavisor transaction pooler, port `6543`, avec `pgbouncer=true&connection_limit=5`. Runtime uniquement.
- `DIRECT_URL` : session pooler, port `5432`. Prisma CLI, migrations, seed et import uniquement.

Les commandes Prisma échouent volontairement si `DIRECT_URL` manque. Les deux projets Vercel utilisent les mêmes valeurs et la même base Supabase en `eu-west-1`.

## Déploiement Vercel

Créer deux projets depuis ce même dépôt :

| Projet | Root Directory | Région | Commande de build |
| --- | --- | --- | --- |
| Planning | `apps/planning` | `dub1` | `npm run build` |
| Stock | `apps/stock` | `dub1` | `npm run build` |

Dans les deux projets, définir `DATABASE_URL`, `DIRECT_URL` et le même `SESSION_SECRET` (32 caractères aléatoires minimum). Dans Stock, ajouter aussi les variables VAPID et `CRON_SECRET`. Fluid Compute peut rester activé.

Le cookie de session est partagé uniquement si les deux apps sont publiées sous le même domaine parent avec une configuration de cookie adaptée. Sur deux domaines Vercel distincts, les comptes restent communs mais chaque app demande sa propre connexion.

## Migrations : sauvegarde obligatoire

Ne jamais modifier une migration déjà appliquée et ne jamais lancer une migration de production automatiquement depuis ce dépôt.

Les migrations suivantes sont en attente de déploiement :

- `20260810230000_stock_access` — droit `canStock`.
- `20260810233000_stock_lots_fefo` — lots, DLC, index et reprise des quantités existantes.
- `20260810234500_login_attempt_ip` — limitation de connexion par IP.
- `20260810235000_note_push_claim` — claim/retry des rappels.
- `20260811130000_user_pin_hash` — PIN de pointage haché, sans modification des comptes existants.
- `20260811001000_remove_out_of_scope_modules` — **destructive** : supprime compta, recettes et réseaux sociaux.

Procédure production :

1. Faire et vérifier une sauvegarde Supabase.
2. Relire le SQL de toutes les migrations ci-dessus, surtout la migration destructive.
3. Exporter `DIRECT_URL` vers le pooler session `5432`.
4. Exécuter manuellement `npm run db:deploy`.
5. Déployer Planning et Stock, puis tester connexion, pointage, création de créneau et mouvement de stock.

## CI et sécurité

GitHub Actions démarre un PostgreSQL isolé, applique les migrations, seed un admin, puis exécute lint, typecheck, tests, builds des deux apps et quatre parcours Playwright critiques. La CI n’accède jamais à Supabase production.

Le plan Vercel Hobby ne garantit qu’un cron quotidien à heure approximative. Les rappels plus fréquents exigent Vercel Pro ou un déclencheur externe.
