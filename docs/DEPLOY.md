# Déploiement

TrellTech se déploie en **stack complet sur un VPS** via `docker-compose.prod.yml`
(db + api + web). Le VPS build lui-même les images depuis le dépôt ; rien n'est
poussé vers un registre.

## Pourquoi un VPS et pas Vercel

Le front Next.js pourrait vivre sur Vercel. En revanche l'API est un serveur
**Fastify long-running** avec **WebSocket temps réel** et une **base Postgres** :
ça ne convient pas au modèle serverless de Vercel. On héberge donc tout sur le VPS.

Option front-seul-sur-Vercel possible : déployer `apps/web` sur Vercel avec
`NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_SITE_URL` pointant vers l'API du VPS. Le
tout-en-un VPS reste recommandé pour garder un seul point d'exploitation.

## Déploiement continu (CI)

Le job `deploy` de `.github/workflows/ci.yml` se déclenche sur `push` vers `main`,
après le passage des jobs `checks` et `test`. Il se connecte au VPS en SSH et
exécute :

```
cd "$VPS_PATH"
git fetch --all
git reset --hard origin/main
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker image prune -f
```

L'étape SSH est gardée par `if: env.VPS_HOST != ''` : tant que les secrets VPS ne
sont pas configurés, le job reste **vert** sans rien déployer.

## Secrets GitHub à créer

Dans `Settings → Secrets and variables → Actions` :

| Secret        | Rôle                                              |
| ------------- | ------------------------------------------------- |
| `VPS_HOST`    | IP ou domaine du VPS                              |
| `VPS_USER`    | Utilisateur SSH                                   |
| `VPS_SSH_KEY` | Clé privée SSH (format PEM) autorisée sur le VPS |
| `VPS_PATH`    | Chemin absolu du dépôt cloné sur le VPS          |
| `VPS_PORT`    | Port SSH (optionnel, défaut 22)                  |

## Préparation du VPS (une fois)

1. Installer Docker + le plugin Compose.
2. Cloner le dépôt dans `VPS_PATH` :
   ```
   git clone git@github.com:antoine-gourgue/TrellTech.git "$VPS_PATH"
   ```
3. Créer `.env.production` à partir de `.env.example` (section « Production ») et
   renseigner les vraies valeurs. Ce fichier est **gitignoré**, il vit uniquement
   sur le VPS :
   ```
   cd "$VPS_PATH"
   cp .env.example .env.production
   # éditer .env.production
   ```
   Points clés :
   - `DATABASE_URL` cible le service compose `db` (host `db`, pas `localhost`).
   - `SESSION_SECRET` : `openssl rand -hex 32`.
   - `WEB_ORIGIN`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL` : les URLs
     publiques réelles.
4. Autoriser la clé publique correspondant à `VPS_SSH_KEY` dans
   `~/.ssh/authorized_keys` de `VPS_USER`.

Les migrations Prisma sont appliquées automatiquement au démarrage du conteneur
API (`prisma migrate deploy` dans l'entrypoint).

## Lancer / tirer manuellement

Sur le VPS :

```
cd "$VPS_PATH"
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker compose -f docker-compose.prod.yml logs -f
```

Le web écoute sur `WEB_PORT` (défaut 3000), l'API sur `API_PORT` (défaut 4000).
Brancher un reverse-proxy (Caddy, Traefik, nginx) devant pour le TLS et les
domaines publics.

## Domaines & reverse proxy (production réelle)

Déploiement cible :

| Rôle  | Domaine                                   | Conteneur (localhost) |
| ----- | ----------------------------------------- | --------------------- |
| Front | `trelltech.antoinegourgue.dev`            | `127.0.0.1:3000`      |
| API   | `trelltech.api.antoinegourgue.dev`        | `127.0.0.1:4000`      |

Les deux sous-domaines partagent `antoinegourgue.dev` → **même site** : la session
`SameSite=lax` fonctionne entre le front et l'API sans réglage supplémentaire.

### 1. DNS
Créer deux enregistrements A (et AAAA si IPv6) vers l'IP du VPS :
```
trelltech.antoinegourgue.dev.       A   <IP_DU_VPS>
trelltech.api.antoinegourgue.dev.   A   <IP_DU_VPS>
```

### 2. `.env.production` (sur le VPS)
```
DATABASE_URL="postgresql://trelltech:<motdepasse>@db:5432/trelltech?schema=public"
POSTGRES_USER=trelltech
POSTGRES_PASSWORD=<motdepasse>
POSTGRES_DB=trelltech
SESSION_SECRET=<openssl rand -hex 32>
WEB_ORIGIN=https://trelltech.antoinegourgue.dev
TRELLO_API_KEY=<clé API Trello>
TRELLO_API_SECRET=<secret Trello>
TRELLO_OAUTH_CALLBACK_URL=https://trelltech.api.antoinegourgue.dev/api/auth/trello/callback
NEXT_PUBLIC_API_URL=https://trelltech.api.antoinegourgue.dev
NEXT_PUBLIC_SITE_URL=https://trelltech.antoinegourgue.dev
```

### 3. Reverse proxy hôte (exemple Caddy, TLS automatique)
Le compose lie les services sur `127.0.0.1` ; le proxy hôte fait le TLS et route
les sous-domaines. Extrait de `Caddyfile` :
```
trelltech.antoinegourgue.dev {
    reverse_proxy 127.0.0.1:3000
}
trelltech.api.antoinegourgue.dev {
    reverse_proxy 127.0.0.1:4000
}
```
(Équivalent possible avec Traefik/nginx + certbot.)

### 4. Power-Up Trello
Dans `https://trello.com/power-ups/admin` → le Power-Up TrellTech → **Clé d'API** →
« Origines autorisées », ajouter :
```
https://trelltech.antoinegourgue.dev
https://trelltech.api.antoinegourgue.dev
```
Le `return_url` de l'OAuth (= `TRELLO_OAUTH_CALLBACK_URL`) pointe sur l'origine API,
qui doit figurer dans cette liste.
