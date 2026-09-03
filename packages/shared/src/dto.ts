import { z } from 'zod';

/**
 * DTO d'entrée — utilisés pour valider les requêtes côté API
 * et typer les appels côté front. Une seule source de vérité.
 */

const name = z.string().trim().min(1, 'Le nom est requis').max(200);

/** ─── Authentification (email / mot de passe) ──────────────────────── */

export const RegisterInput = z.object({
  email: z.string().trim().toLowerCase().email('Email invalide').max(200),
  password: z.string().min(8, 'Au moins 8 caractères').max(200),
  fullName: z.string().trim().min(1).max(200).optional(),
});
export type RegisterInput = z.infer<typeof RegisterInput>;

export const LoginInput = z.object({
  email: z.string().trim().toLowerCase().email('Email invalide').max(200),
  password: z.string().min(1, 'Mot de passe requis').max(200),
});
export type LoginInput = z.infer<typeof LoginInput>;

/** ─── Workspaces ───────────────────────────────────────────────────── */

export const CreateWorkspaceInput = z.object({
  displayName: name,
  description: z.string().max(2000).optional(),
});
export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceInput>;

export const UpdateWorkspaceInput = z.object({
  displayName: name.optional(),
  description: z.string().max(2000).nullable().optional(),
});
export type UpdateWorkspaceInput = z.infer<typeof UpdateWorkspaceInput>;

/** ─── Boards ───────────────────────────────────────────────────────── */

export const CreateBoardInput = z.object({
  workspaceId: z.string().min(1),
  name,
  description: z.string().max(2000).optional(),
  background: z.string().max(200).optional(),
});
export type CreateBoardInput = z.infer<typeof CreateBoardInput>;

export const UpdateBoardInput = z.object({
  name: name.optional(),
  description: z.string().max(2000).nullable().optional(),
  background: z.string().max(200).nullable().optional(),
  closed: z.boolean().optional(),
});
export type UpdateBoardInput = z.infer<typeof UpdateBoardInput>;

/** Partage de board : inviter par nom d'utilisateur ou id, avec un rôle. */
export const ShareBoardInput = z.object({
  userQuery: z.string().min(1), // username ou id
  role: z.enum(['EDITOR', 'VIEWER']),
});
export type ShareBoardInput = z.infer<typeof ShareBoardInput>;

export const UpdateBoardMemberInput = z.object({
  role: z.enum(['EDITOR', 'VIEWER']),
});
export type UpdateBoardMemberInput = z.infer<typeof UpdateBoardMemberInput>;

/** Génération d'un lien de partage : choix du rôle accordé au visiteur. */
export const CreateShareLinkInput = z.object({
  role: z.enum(['EDITOR', 'VIEWER']),
});
export type CreateShareLinkInput = z.infer<typeof CreateShareLinkInput>;

/** Rejoindre un board via un lien de partage (jeton signé). */
export const JoinBoardInput = z.object({
  token: z.string().min(1),
});
export type JoinBoardInput = z.infer<typeof JoinBoardInput>;

/** ─── Lists ────────────────────────────────────────────────────────── */

export const CreateListInput = z.object({
  boardId: z.string().min(1),
  name,
});
export type CreateListInput = z.infer<typeof CreateListInput>;

export const UpdateListInput = z.object({
  name: name.optional(),
  closed: z.boolean().optional(),
});
export type UpdateListInput = z.infer<typeof UpdateListInput>;

/** Réordonnancement d'une liste (drag & drop des colonnes) : index cible. */
export const MoveListInput = z.object({
  position: z.number(),
});
export type MoveListInput = z.infer<typeof MoveListInput>;

/** ─── Cards ────────────────────────────────────────────────────────── */

export const CreateCardInput = z.object({
  listId: z.string().min(1),
  name,
  description: z.string().max(5000).optional(),
});
export type CreateCardInput = z.infer<typeof CreateCardInput>;

export const UpdateCardInput = z.object({
  name: name.optional(),
  description: z.string().max(50000).nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  dueComplete: z.boolean().optional(),
  closed: z.boolean().optional(),
});
export type UpdateCardInput = z.infer<typeof UpdateCardInput>;

/** Déplacement d'une carte (drag & drop) : liste cible + index. */
export const MoveCardInput = z.object({
  listId: z.string().min(1),
  position: z.number(),
});
export type MoveCardInput = z.infer<typeof MoveCardInput>;

/** ─── Labels ───────────────────────────────────────────────────────── */

export const CreateLabelInput = z.object({
  boardId: z.string().min(1),
  name: z.string().trim().max(200),
  color: z.string().min(1).max(40),
});
export type CreateLabelInput = z.infer<typeof CreateLabelInput>;

export const UpdateLabelInput = z.object({
  name: z.string().trim().max(200).optional(),
  color: z.string().min(1).max(40).optional(),
});
export type UpdateLabelInput = z.infer<typeof UpdateLabelInput>;

/** ─── Checklists ───────────────────────────────────────────────────── */

export const CreateChecklistInput = z.object({
  cardId: z.string().min(1),
  name,
});
export type CreateChecklistInput = z.infer<typeof CreateChecklistInput>;

export const UpdateChecklistInput = z.object({
  name: name.optional(),
});
export type UpdateChecklistInput = z.infer<typeof UpdateChecklistInput>;

export const CreateChecklistItemInput = z.object({
  checklistId: z.string().min(1),
  name,
});
export type CreateChecklistItemInput = z.infer<typeof CreateChecklistItemInput>;

export const UpdateChecklistItemInput = z.object({
  name: name.optional(),
  checked: z.boolean().optional(),
  position: z.number().optional(),
});
export type UpdateChecklistItemInput = z.infer<typeof UpdateChecklistItemInput>;

/** ─── Comments ─────────────────────────────────────────────────────── */

export const CreateCommentInput = z.object({
  cardId: z.string().min(1),
  text: z.string().trim().min(1).max(10000),
});
export type CreateCommentInput = z.infer<typeof CreateCommentInput>;

export const UpdateCommentInput = z.object({
  text: z.string().trim().min(1).max(10000),
});
export type UpdateCommentInput = z.infer<typeof UpdateCommentInput>;

/** ─── Attachments ──────────────────────────────────────────────────── */

export const CreateAttachmentInput = z.object({
  cardId: z.string().min(1),
  name: z.string().trim().min(1).max(300),
  url: z.string().url(),
  mime: z.string().max(200).optional(),
  isCover: z.boolean().optional(),
});
export type CreateAttachmentInput = z.infer<typeof CreateAttachmentInput>;

/** ─── Docs (Notion) ────────────────────────────────────────────────── */

export const CreateDocInput = z.object({
  workspaceId: z.string().min(1),
  title: z.string().trim().max(300).optional(),
  icon: z.string().max(40).optional(),
});
export type CreateDocInput = z.infer<typeof CreateDocInput>;

export const UpdateDocInput = z.object({
  title: z.string().trim().max(300).optional(),
  icon: z.string().max(40).nullable().optional(),
  blocks: z.unknown().optional(), // document de l'éditeur à blocs
});
export type UpdateDocInput = z.infer<typeof UpdateDocInput>;

/** ─── Whiteboards (Excalidraw) ─────────────────────────────────────── */

export const CreateWhiteboardInput = z.object({
  workspaceId: z.string().min(1),
  title: z.string().trim().max(300).optional(),
});
export type CreateWhiteboardInput = z.infer<typeof CreateWhiteboardInput>;

export const UpdateWhiteboardInput = z.object({
  title: z.string().trim().max(300).optional(),
  scene: z.unknown().optional(), // { elements, appState, files }
});
export type UpdateWhiteboardInput = z.infer<typeof UpdateWhiteboardInput>;

/** ─── Recherche ────────────────────────────────────────────────────── */

export const SearchQueryInput = z.object({
  q: z.string().trim().min(1).max(200),
});
export type SearchQueryInput = z.infer<typeof SearchQueryInput>;

/** ─── Enveloppe d'erreur standard ──────────────────────────────────── */

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
