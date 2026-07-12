# Gestion Restaurant

Outil interne de gestion pour restaurant : stock &amp; inventaire, planning &amp; pointage des équipes. Les modules Fichiers/Recettes et Social Media Planner arrivent dans une prochaine étape.

## Stack

- [Next.js 16](https://nextjs.org) (App Router, Server Actions, TypeScript)
- [Prisma 7](https://www.prisma.io) + adaptateur `@prisma/adapter-pg`
- [Neon](https://neon.tech) (Postgres serverless) en production
- Auth maison par session (cookie httpOnly signé avec `jose`), sans dépendance externe
- Déploiement visé : [Vercel](https://vercel.com)

## Démarrage local

1. Copier `.env.example` en `.env` et renseigner `DATABASE_URL` (une base Postgres locale ou Neon) et `SESSION_SECRET` (`openssl rand -base64 32`).
2. Installer les dépendances : `npm install`
3. Appliquer les migrations : `npm run db:migrate`
4. Créer le compte admin initial : `npm run db:seed`
5. Lancer le serveur de développement : `npm run dev`
6. Se connecter sur [http://localhost:3000/login](http://localhost:3000/login) avec l'identifiant/mot de passe définis dans `.env` (`SEED_ADMIN_IDENTIFIER` / `SEED_ADMIN_PASSWORD`).

## Déploiement (Vercel + Neon)

1. Créer un projet [Neon](https://neon.com), récupérer la **connection string poolée** et la mettre dans la variable d'environnement `DATABASE_URL` du projet Vercel.
2. Définir `SESSION_SECRET` dans les variables d'environnement Vercel.
3. Déployer sur Vercel (le script `postinstall` lance automatiquement `prisma generate`).
4. Appliquer les migrations sur la base Neon : `npx prisma migrate deploy` (en local, avec `DATABASE_URL` pointant vers Neon), puis lancer `npm run db:seed` une fois pour créer le premier compte admin.

## Modules disponibles (MVP)

- **Stock & Inventaire** (`/stock`, admin uniquement) : articles multi-catégories (matériel, consommables, alimentaire), seuil d'alerte, mouvements d'entrée/sortie, alerte visible sur le tableau de bord dès qu'un article atteint son seuil.
- **Planning** (`/planning`) : l'admin assigne des créneaux par employé, total d'heures prévues calculé automatiquement par mois. Chaque employé voit uniquement son propre planning.
- **Pointage** (`/pointage`) : bouton pointer arrivée/départ pour l'employé connecté, total d'heures réelles calculé automatiquement à partir des pointages. Le QR code / badge NFC est prévu pour une itération future (décision à prendre plus tard).
- **Employés** (`/employees`, admin uniquement) : création des comptes (identifiant + mot de passe), rôle admin ou employé.

## Prochaines étapes

- Module Fichiers du restaurant & Recettes (menu, boissons, marinades).
- Module Social Media Planner (idées, banque de médias sur Cloudflare R2, calendrier éditorial).
- Notifications de réapprovisionnement par email (actuellement l'alerte est visible uniquement dans l'app).
- Pointage par QR code / NFC (actuellement pointage manuel par bouton, suffisant pour la v1).
