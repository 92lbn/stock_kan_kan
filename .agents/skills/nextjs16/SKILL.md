---
name: nextjs16
description: Conventions App Router de CETTE version de Next (16.2, React 19). À charger AVANT d'utiliser une API Next — routing, Server Actions/Functions, Suspense, caching, PPR/cacheComponents, proxy, metadata, runtime. Cette version a des breaking changes vs les connaissances d'entraînement.
---

# Next.js 16.2 — cette version, pas celle que tu crois

RÈGLE ABSOLUE : avant d'utiliser une API Next, ouvre le guide correspondant dans
`node_modules/next/dist/docs/01-app/`. Ne devine jamais une signature ou un flag.

## Breaking changes à retenir

- **Middleware → Proxy.** Le fichier est `src/proxy.ts` (export `proxy` ou default), plus
  `middleware.ts`. Même API `NextRequest`/`NextResponse`, même `config.matcher`. Le proxy
  n'est PAS de la gestion de session/autorisation : il fait des checks optimistes (redirection).
  La vraie garde d'auth vit dans la DAL / les server actions.
- **`cacheComponents: true`** dans `next.config.ts` remplace `experimental.ppr`,
  `experimental.dynamicIO` et `experimental.useCache`. Il active le PPR par défaut : shell
  statique prérendu + streaming du dynamique. Va avec la directive `use cache`, `cacheLife()`,
  `cacheTag()`. Le data-fetching est dynamique par défaut, on choisit ce qu'on cache.
- **`params`, `searchParams`, `cookies()`, `headers()` sont async** — toujours `await`.
- Après mutation : `revalidatePath`/`revalidateTag` depuis `next/cache`, ou `refresh()`
  (rafraîchit le router client, ne revalide PAS les tags), ou `updateTag`.

## Server Actions / Functions

- Directive `"use server"` en tête de fichier ou de fonction. Fonction async obligatoire.
- ⚠️ Joignables par POST direct, pas seulement via l'UI → auth vérifiée DANS chaque action
  (voir le skill `server-action-security`).
- Le client les dispatche UNE PAR UNE (séquentiel). Pour du parallélisme, fetch dans un Server
  Component ou fais le travail parallèle DANS une seule action (voir `perf-budget`).
- Pending state : `useActionState` (retourne `[state, action, pending]`).

## Rendu & streaming

- Découpe les zones dynamiques en `<Suspense>` avec un fallback qui a la forme réelle du contenu.
- Un `loading.tsx` s'applique à TOUTE la sous-arborescence et coupe le prefetch à sa frontière :
  préfère des `<Suspense>` ciblés (voir `perf-budget`).
- `<Activity>` (via cacheComponents) préserve l'état des routes lors de la navigation client.

## Fichiers de convention

`layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx` (client), `not-found.tsx`,
`global-error.tsx`, `route.ts`. Runtime : `export const runtime = "nodejs"` quand une lib Node
est requise (ex. web-push, bcrypt côté route).

Stack : Next 16.2.10, React 19.2, Tailwind 4, Prisma 7 + adapter-pg, jose, Vercel dub1 + Fluid Compute.
