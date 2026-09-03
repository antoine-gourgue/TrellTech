import { z } from 'zod';

/**
 * Contrats de domaine partagés entre l'API et le front.
 * Ce sont les objets renvoyés par l'API (jamais les champs sensibles
 * comme le token Trello).
 */

/** Utilisateur privé (soi-même). */
export const UserSchema = z.object({
  id: z.string(),
  trelloId: z.string().nullable(),
  username: z.string(),
  fullName: z.string().nullable(),
  email: z.string().email().nullable(),
  avatarUrl: z.string().url().nullable(),
  createdAt: z.string(),
  /** Vrai si un compte Trello est lié (token présent côté serveur). */
  trelloLinked: z.boolean(),
  /** Vrai si un mot de passe est défini (compte email/mot de passe). */
  hasPassword: z.boolean(),
});
export type User = z.infer<typeof UserSchema>;

/** Utilisateur public (membre, auteur de commentaire) — jamais d'email. */
export const PublicUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  fullName: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
});
export type PublicUser = z.infer<typeof PublicUserSchema>;

export const WorkspaceSchema = z.object({
  id: z.string(),
  trelloId: z.string().nullable(),
  name: z.string(),
  displayName: z.string(),
  description: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Workspace = z.infer<typeof WorkspaceSchema>;

export const BoardSchema = z.object({
  id: z.string(),
  trelloId: z.string().nullable(),
  workspaceId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  background: z.string().nullable(),
  closed: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Board = z.infer<typeof BoardSchema>;

/** Rôles de partage d'un board. */
export const BoardRoleSchema = z.enum(['OWNER', 'EDITOR', 'VIEWER']);
export type BoardRole = z.infer<typeof BoardRoleSchema>;

export const BoardMemberSchema = z.object({
  user: PublicUserSchema,
  role: BoardRoleSchema,
});
export type BoardMember = z.infer<typeof BoardMemberSchema>;

/** Membre générique (board, espace de travail, doc, whiteboard). */
export const MemberSchema = z.object({
  user: PublicUserSchema,
  role: BoardRoleSchema,
});
export type Member = z.infer<typeof MemberSchema>;

/** Lien de partage (jeton signé, sans stockage) — board, espace, doc, whiteboard. */
export const ShareLinkSchema = z.object({
  token: z.string(),
  url: z.string(),
  role: z.enum(['EDITOR', 'VIEWER']),
});
export type ShareLink = z.infer<typeof ShareLinkSchema>;

/** Rétrocompat : anciens noms spécifiques au board. */
export const BoardShareLinkSchema = ShareLinkSchema;
export type BoardShareLink = ShareLink;

/** Étiquette gérée, rattachée à un board. */
export const LabelSchema = z.object({
  id: z.string(),
  boardId: z.string(),
  name: z.string(),
  color: z.string(), // clé de couleur du design system (ex: "indigo", "green")
});
export type Label = z.infer<typeof LabelSchema>;

export const ListSchema = z.object({
  id: z.string(),
  trelloId: z.string().nullable(),
  boardId: z.string(),
  name: z.string(),
  position: z.number(),
  closed: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type List = z.infer<typeof ListSchema>;

export const ChecklistItemSchema = z.object({
  id: z.string(),
  checklistId: z.string(),
  name: z.string(),
  checked: z.boolean(),
  position: z.number(),
});
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;

export const ChecklistSchema = z.object({
  id: z.string(),
  cardId: z.string(),
  name: z.string(),
  position: z.number(),
  items: z.array(ChecklistItemSchema),
});
export type Checklist = z.infer<typeof ChecklistSchema>;

export const CommentSchema = z.object({
  id: z.string(),
  cardId: z.string(),
  author: PublicUserSchema,
  text: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Comment = z.infer<typeof CommentSchema>;

export const AttachmentSchema = z.object({
  id: z.string(),
  cardId: z.string(),
  name: z.string(),
  url: z.string(),
  mime: z.string().nullable(),
  isCover: z.boolean(),
  createdAt: z.string(),
});
export type Attachment = z.infer<typeof AttachmentSchema>;

/** Entrée du journal d'activité d'une carte. */
export const ActivitySchema = z.object({
  id: z.string(),
  cardId: z.string(),
  user: PublicUserSchema.nullable(),
  type: z.string(),
  data: z.unknown().nullable(),
  createdAt: z.string(),
});
export type Activity = z.infer<typeof ActivitySchema>;

export const CardSchema = z.object({
  id: z.string(),
  trelloId: z.string().nullable(),
  listId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  position: z.number(),
  dueDate: z.string().nullable(),
  dueComplete: z.boolean(),
  closed: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  // Résumés légers affichés sur la carte du board :
  labels: z.array(LabelSchema),
  members: z.array(PublicUserSchema),
  checklistSummary: z.object({ done: z.number(), total: z.number() }),
  commentCount: z.number(),
  attachmentCount: z.number(),
  coverUrl: z.string().nullable(),
});
export type Card = z.infer<typeof CardSchema>;

/** Carte complète (modale de détail). */
export const CardDetailSchema = CardSchema.extend({
  checklists: z.array(ChecklistSchema),
  comments: z.array(CommentSchema),
  attachments: z.array(AttachmentSchema),
  activity: z.array(ActivitySchema),
});
export type CardDetail = z.infer<typeof CardDetailSchema>;

/** Board complet avec listes, cartes et étiquettes disponibles. */
export const BoardDetailSchema = BoardSchema.extend({
  labels: z.array(LabelSchema),
  members: z.array(BoardMemberSchema),
  lists: z.array(
    ListSchema.extend({
      cards: z.array(CardSchema),
    }),
  ),
});
export type BoardDetail = z.infer<typeof BoardDetailSchema>;

/** ─── Contenus type Notion / Excalidraw (niveau workspace) ─────────── */

/** Document type Notion. `blocks` est le document de l'éditeur à blocs (JSON). */
export const DocSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  title: z.string(),
  icon: z.string().nullable(),
  blocks: z.unknown(), // tableau de blocs de l'éditeur (BlockNote)
  position: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Doc = z.infer<typeof DocSchema>;

/** Résumé de doc pour la sidebar (sans le contenu). */
export const DocSummarySchema = DocSchema.omit({ blocks: true });
export type DocSummary = z.infer<typeof DocSummarySchema>;

/** Tableau blanc Excalidraw. `scene` = { elements, appState, files }. */
export const WhiteboardSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  title: z.string(),
  scene: z.unknown(),
  position: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Whiteboard = z.infer<typeof WhiteboardSchema>;

export const WhiteboardSummarySchema = WhiteboardSchema.omit({ scene: true });
export type WhiteboardSummary = z.infer<typeof WhiteboardSummarySchema>;

/** Workspace avec tous ses contenus (sidebar). `role` = rôle effectif de
 * l'utilisateur courant sur cet espace (OWNER si propriétaire ou membre
 * plein propriétaire, EDITOR/VIEWER si membre invité). */
export const WorkspaceWithContentSchema = WorkspaceSchema.extend({
  role: BoardRoleSchema,
  boards: z.array(BoardSchema),
  docs: z.array(DocSummarySchema),
  whiteboards: z.array(WhiteboardSummarySchema),
});
export type WorkspaceWithContent = z.infer<typeof WorkspaceWithContentSchema>;

/** Contenus partagés INDIVIDUELLEMENT avec l'utilisateur (section
 * « Partagé avec moi » de la sidebar) — hors espaces dont il est membre. */
export const SharedWithMeSchema = z.object({
  boards: z.array(BoardSchema),
  docs: z.array(DocSummarySchema),
  whiteboards: z.array(WhiteboardSummarySchema),
});
export type SharedWithMe = z.infer<typeof SharedWithMeSchema>;

/** Rétrocompat : ancien nom, désormais aligné sur le contenu complet. */
export const WorkspaceWithBoardsSchema = WorkspaceWithContentSchema;
export type WorkspaceWithBoards = WorkspaceWithContent;

/** ─── Notifications ────────────────────────────────────────────────── */

export const NotificationSchema = z.object({
  id: z.string(),
  type: z.string(), // ex: "card_assigned", "comment_added", "due_soon"
  title: z.string(),
  message: z.string(),
  read: z.boolean(),
  boardId: z.string().nullable(),
  cardId: z.string().nullable(),
  createdAt: z.string(),
});
export type Notification = z.infer<typeof NotificationSchema>;

/** ─── Événements temps réel (WebSocket) ────────────────────────────── */

/**
 * Enveloppe des messages temps réel. Le client s'abonne à un board et reçoit
 * ces événements. `entity` = quoi, `action` = created|updated|deleted|moved.
 */
export const RealtimeEventSchema = z.object({
  boardId: z.string(),
  entity: z.enum(['board', 'list', 'card', 'comment', 'checklist', 'label', 'member']),
  action: z.enum(['created', 'updated', 'deleted', 'moved']),
  id: z.string(),
  payload: z.unknown().optional(),
  actorId: z.string().nullable(),
});
export type RealtimeEvent = z.infer<typeof RealtimeEventSchema>;
