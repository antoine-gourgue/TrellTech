# TrellTech — Spécification des endpoints API

Source de vérité des routes. Types dans `@trelltech/shared`. Tout est protégé par
session (`requireAuth`) sauf la section Auth. Autorisation par appartenance
(workspace possédé, ou board partagé selon rôle). Erreurs = enveloppe `ApiErrorSchema`.

## Auth (existant)
- `GET /api/health` → `{status, trelloConfigured}`
- `GET /api/auth/trello/login` → 302 Trello
- `GET /api/auth/trello/callback` → page HTML fragment→session
- `POST /api/auth/trello/session` `{token}` → `User`
- `GET /api/auth/me` → `User` | 401
- `POST /api/auth/logout` → 204
- `GET /api/auth/status` → `{authenticated, trelloConfigured}`

## Workspaces
- `GET /api/workspaces` → `WorkspaceWithContent[]` (boards + docs + whiteboards)
- `POST /api/workspaces` `CreateWorkspaceInput` → `Workspace`
- `PATCH /api/workspaces/:id` `UpdateWorkspaceInput` → `Workspace`
- `DELETE /api/workspaces/:id` → 204

## Boards
- `GET /api/boards/:id` → `BoardDetail` (lists+cards résumées, labels, members)
- `POST /api/boards` `CreateBoardInput` → `Board`
- `PATCH /api/boards/:id` `UpdateBoardInput` → `Board`
- `DELETE /api/boards/:id` → 204
- Partage :
  - `GET /api/boards/:id/members` → `BoardMember[]`
  - `POST /api/boards/:id/members` `ShareBoardInput` → `BoardMember`
  - `PATCH /api/boards/:id/members/:userId` `UpdateBoardMemberInput` → `BoardMember`
  - `DELETE /api/boards/:id/members/:userId` → 204

## Lists
- `POST /api/lists` `CreateListInput` → `List`
- `PATCH /api/lists/:id` `UpdateListInput` → `List`
- `PATCH /api/lists/:id/move` `MoveListInput` → `List` (réordonnancement colonnes)
- `DELETE /api/lists/:id` → 204

## Cards
- `GET /api/cards/:id` → `CardDetail`
- `POST /api/cards` `CreateCardInput` → `Card`
- `PATCH /api/cards/:id` `UpdateCardInput` → `Card`
- `PATCH /api/cards/:id/move` `MoveCardInput` → `Card`
- `DELETE /api/cards/:id` → 204
- Étiquettes de carte : `PUT /api/cards/:id/labels/:labelId` → 204 ; `DELETE /api/cards/:id/labels/:labelId` → 204
- Membres de carte : `PUT /api/cards/:id/members/:userId` → 204 ; `DELETE /api/cards/:id/members/:userId` → 204

## Labels (par board)
- `POST /api/labels` `CreateLabelInput` → `Label`
- `PATCH /api/labels/:id` `UpdateLabelInput` → `Label`
- `DELETE /api/labels/:id` → 204

## Checklists
- `POST /api/checklists` `CreateChecklistInput` → `Checklist`
- `PATCH /api/checklists/:id` `UpdateChecklistInput` → `Checklist`
- `DELETE /api/checklists/:id` → 204
- `POST /api/checklist-items` `CreateChecklistItemInput` → `ChecklistItem`
- `PATCH /api/checklist-items/:id` `UpdateChecklistItemInput` → `ChecklistItem`
- `DELETE /api/checklist-items/:id` → 204

## Comments
- `POST /api/comments` `CreateCommentInput` → `Comment`
- `PATCH /api/comments/:id` `UpdateCommentInput` → `Comment`
- `DELETE /api/comments/:id` → 204

## Attachments
- `POST /api/attachments` `CreateAttachmentInput` → `Attachment`
- `DELETE /api/attachments/:id` → 204

## Docs (Notion, niveau workspace)
- `GET /api/docs/:id` → `Doc` (avec blocks)
- `POST /api/docs` `CreateDocInput` → `Doc`
- `PATCH /api/docs/:id` `UpdateDocInput` → `Doc`
- `DELETE /api/docs/:id` → 204

## Whiteboards (Excalidraw, niveau workspace)
- `GET /api/whiteboards/:id` → `Whiteboard` (avec scene)
- `POST /api/whiteboards` `CreateWhiteboardInput` → `Whiteboard`
- `PATCH /api/whiteboards/:id` `UpdateWhiteboardInput` → `Whiteboard`
- `DELETE /api/whiteboards/:id` → 204

## Notifications
- `GET /api/notifications` → `Notification[]`
- `POST /api/notifications/:id/read` → 204
- `POST /api/notifications/read-all` → 204

## Recherche
- `GET /api/search?q=...` → `{ boards: Board[], cards: Card[], docs: DocSummary[] }`

## Sync Trello (existant, à conserver)
- `POST /api/sync/trello` → import
- Webhooks : `POST /api/webhooks/trello` (callback Trello) + `HEAD` pour la vérification

## Temps réel
- WebSocket sur `/ws` : le client envoie `{ subscribe: boardId }` ; le serveur pousse
  des `RealtimeEvent` (voir `@trelltech/shared`) à chaque mutation d'un board.
  Authentifié via le cookie de session. Émettre un événement après CHAQUE mutation
  (card/list/label/comment/checklist/member created|updated|deleted|moved).

## Partage étendu (espaces, docs, whiteboards) — nouveau

Modèle : trois niveaux de partage, cumulables.
- **Espace de travail** : `WorkspaceMembership(workspaceId, userId, role)`. Un membre voit TOUT le contenu de l'espace (boards + docs + whiteboards). Le propriétaire est OWNER implicite.
- **Module indépendant** : `BoardMembership` (déjà là), plus nouveaux `DocMembership(docId,userId,role)` et `WhiteboardMembership(whiteboardId,userId,role)`. Partager un module ne donne PAS accès au reste de l'espace.

Autorisation (mettre à jour `lib/access.ts`) :
- Board : propriétaire du workspace OU membre du workspace OU membre du board.
- Doc / Whiteboard : propriétaire du workspace OU membre du workspace OU membre du doc/whiteboard.
- Rôle effectif = le plus fort parmi ceux applicables. VIEWER = lecture seule (403 sur mutation).

Jeton de lien : généraliser `lib/share-token.ts` pour encoder `{ t: 'workspace'|'board'|'doc'|'whiteboard', id, r, exp }`. Un seul endpoint de join lit le type dans le jeton.

Endpoints (tous `requireAuth`) :
- Membres (mêmes formes que board) pour chaque type :
  - `GET/POST /api/workspaces/:id/members`, `PATCH/DELETE /api/workspaces/:id/members/:userId`
  - `GET/POST /api/docs/:id/members`, `PATCH/DELETE /api/docs/:id/members/:userId`
  - `GET/POST /api/whiteboards/:id/members`, `PATCH/DELETE /api/whiteboards/:id/members/:userId`
  - Corps POST = `ShareBoardInput` (`{ userQuery, role }`), réutilisé pour tous. Sortie = `Member`.
  - Seul le OWNER (propriétaire) peut gérer les membres / générer un lien.
- Liens de partage :
  - `GET /api/workspaces/:id/share-link?role=` → `ShareLink`
  - `GET /api/docs/:id/share-link?role=` → `ShareLink`
  - `GET /api/whiteboards/:id/share-link?role=` → `ShareLink`
  - (board existant `GET /api/boards/:id/share-link?role=` conservé)
  - Join générique : `POST /api/share/join` `{ token }` → renvoie l'entité rejointe et son type, ex. `{ type, id, workspaceId? }`, pour rediriger le front. (L'ancien `POST /api/boards/join` peut rester en alias.)
- Sidebar :
  - `GET /api/workspaces` → `WorkspaceWithContent[]` : espaces OWNED **et** ceux dont l'utilisateur est MEMBRE (avec `role` effectif), contenu filtré à ce qui est accessible.
  - `GET /api/shared` → `SharedWithMe` : boards/docs/whiteboards partagés INDIVIDUELLEMENT avec l'utilisateur et NON déjà couverts par un espace accessible (section « Partagé avec moi »).

Émettre les événements temps réel `member` created/updated/deleted comme pour le board.

## Authentification email / mot de passe + Trello lié — nouveau

L'identité devient un compte propre (email/mot de passe). **Trello devient une intégration** liée depuis les Paramètres, plus le mode de connexion.

Modèle `User` (migration) :
- `passwordHash String?` (haché argon2id ou bcrypt ; JAMAIS renvoyé/loggé).
- `email String? @unique` (identifiant de connexion ; rendre unique, insensible à la casse à l'écriture).
- `trelloToken String?` **devient nullable** (aujourd'hui requis). `trelloId` déjà nullable.
- Sérialisation `User` : ajouter `trelloLinked: boolean` (= token présent) et `hasPassword: boolean` (= passwordHash présent). Ne jamais exposer `passwordHash` ni `trelloToken`.

Endpoints :
- `POST /api/auth/register` `RegisterInput` → crée le compte (email unique, mot de passe haché), pose la session, renvoie `User`. 409 si email déjà pris. `username` dérivé de l'email si absent.
- `POST /api/auth/login` `LoginInput` → vérifie le hash, pose la session, renvoie `User`. 401 générique si email inconnu OU mot de passe faux (ne pas distinguer). Limitation de tentatives (rate-limit) recommandée.
- `POST /api/auth/logout` (existant).
- `GET /api/auth/me` (existant) → `User` (avec `trelloLinked`/`hasPassword`).
- Trello en intégration (utilisateur DÉJÀ authentifié) :
  - `GET /api/auth/trello/link` → démarre l'OAuth Trello (redirection), pour l'utilisateur courant. `requireAuth`.
  - `GET /api/auth/trello/callback` (existant) : sert la page fragment qui POST le token.
  - `POST /api/auth/trello/session` → **change de sémantique** : requiert une session existante et **rattache** le token Trello au compte courant (upsert trelloId/trelloToken/avatar depuis `members/me`), renvoie `User`. (Ne crée plus de compte.)
  - `POST /api/auth/trello/unlink` → efface `trelloId`/`trelloToken` du compte courant. `requireAuth`.
- `POST /api/sync/trello` : si le compte n'a pas de token Trello → 400 « Liez d'abord votre compte Trello ».

Sécurité : hachage fort (argon2id préféré, sinon bcrypt via `bcryptjs`), pas de plaintext, pas de fuite `passwordHash`/`trelloToken`, message d'erreur de login générique.
