# TrellTech

Un espace de travail façon Trello, en plus complet : **tableaux** kanban, **documents**
type Notion et **whiteboards** Excalidraw, avec collaboration temps réel, partage
granulaire et synchronisation Trello. Compte email/mot de passe, Trello branché en
option depuis les réglages.

## Fonctionnalités

- **Tableaux** : espaces de travail, tableaux, listes, cartes, drag & drop (@dnd-kit).
- **Cartes riches** : description Markdown, échéances, étiquettes, checklists, commentaires, membres, pièces jointes, activité.
- **Documents** : éditeur à blocs type Notion (BlockNote), autosave.
- **Whiteboards** : canvas Excalidraw, autosave, thème synchronisé.
- **Temps réel** : WebSocket, mises à jour live du tableau, présence.
- **Partage** : au niveau espace de travail (accès à tout) ou par module (tableau / doc / whiteboard), par invitation ou lien signé. Section « Partagé avec moi ».
- **Vues** : tableau, calendrier, table, filtres, palette de commandes (Cmd-K), archives.
- **Auth** : inscription / connexion email + mot de passe (bcrypt), notifications, page paramètres.
- **Trello** : intégration liable/déliable depuis les réglages, import et synchronisation.

## Stack

- **Front** : Next.js 15 (App Router), React 19, Tailwind CSS v4, @tanstack/react-query, @dnd-kit, BlockNote, Excalidraw.
- **API** : Node + TypeScript, Fastify, Prisma, PostgreSQL, WebSocket, bundlée avec tsup.
- **Partagé** : `@trelltech/shared` (types + schémas Zod), source de vérité des contrats.
- **Monorepo** : npm workspaces.

## Structure

```
apps/
  web/    → Next.js (@trelltech/web)
  api/    → Fastify + Prisma (@trelltech/api)
packages/
  shared/ → contrats Zod partagés (@trelltech/shared)
docs/     → DESIGN, API, DEPLOY
```

## Démarrage local

Prérequis : **Node 20+**, **npm**, **Docker** (pour PostgreSQL).

```bash
# 1. Dépendances
npm install

# 2. Base de données
npm run db:up                 # PostgreSQL via docker-compose

# 3. Configuration API
cp .env.example apps/api/.env # puis renseigner (au minimum DATABASE_URL, SESSION_SECRET)

# 4. Migrations + données de démo
npm run db:migrate
npm run db:seed

# 5. Lancer front + API
npm run dev                   # web sur :3000, API sur :4000
```

Compte de démo (créé par le seed) : **demo@trelltech.local** / **password123**.

L'intégration Trello est optionnelle : elle se lie depuis **Paramètres → Intégration
Trello**. Les clés Trello (`TRELLO_API_KEY` / `TRELLO_API_SECRET`) se récupèrent sur
https://trello.com/power-ups/admin.

## Scripts (racine)

| Commande             | Effet                                            |
| -------------------- | ------------------------------------------------ |
| `npm run dev`        | Front + API en watch                             |
| `npm run build`      | Build de tous les workspaces                     |
| `npm run typecheck`  | `tsc --noEmit` partout                           |
| `npm run lint`       | Lint de tous les workspaces                      |
| `npm run test`       | Tests (Vitest côté API)                          |
| `npm run db:up`      | Démarre PostgreSQL (Docker)                      |
| `npm run db:migrate` | Applique les migrations Prisma                   |
| `npm run db:seed`    | Peuple la base de démo                           |
| `npm run db:studio`  | Ouvre Prisma Studio                              |

## Variables d'environnement

Voir [`.env.example`](.env.example). Côté API : `DATABASE_URL`, `SESSION_SECRET`,
`WEB_ORIGIN`, `TRELLO_API_KEY`, `TRELLO_API_SECRET`, `TRELLO_OAUTH_CALLBACK_URL`.
Côté web : `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`. Les vrais `.env` sont
gitignorés — ne jamais les commiter.

## CI / CD & déploiement

CI GitHub Actions (lint, typecheck, tests avec PostgreSQL, build) sur chaque push et PR.
Déploiement continu sur VPS via SSH (`docker compose -f docker-compose.prod.yml`).
Détails et configuration des domaines dans [docs/DEPLOY.md](docs/DEPLOY.md).

## Documentation

- [docs/DESIGN.md](docs/DESIGN.md) — design system.
- [docs/API.md](docs/API.md) — endpoints de l'API.
- [docs/DEPLOY.md](docs/DEPLOY.md) — déploiement VPS, domaines, reverse proxy.
