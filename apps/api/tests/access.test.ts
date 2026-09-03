import { afterEach, describe, expect, it, vi } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test_session_secret_at_least_16_chars';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://trelltech:trelltech@localhost:5432/trelltech?schema=public';

const docFindUnique = vi.fn();
const whiteboardFindUnique = vi.fn();
const boardFindUnique = vi.fn();
const workspaceFindUnique = vi.fn();
const workspaceMembershipFindUnique = vi.fn();
const docMembershipFindUnique = vi.fn();
const whiteboardMembershipFindUnique = vi.fn();
const boardMembershipFindUnique = vi.fn();

vi.mock('../src/prisma.js', () => ({
  prisma: {
    doc: { findUnique: docFindUnique },
    whiteboard: { findUnique: whiteboardFindUnique },
    board: { findUnique: boardFindUnique },
    workspace: { findUnique: workspaceFindUnique },
    workspaceMembership: { findUnique: workspaceMembershipFindUnique },
    docMembership: { findUnique: docMembershipFindUnique },
    whiteboardMembership: { findUnique: whiteboardMembershipFindUnique },
    boardMembership: { findUnique: boardMembershipFindUnique },
  },
}));

const { requireDoc, requireBoard, requireWhiteboard } = await import('../src/lib/access.js');

afterEach(() => {
  vi.clearAllMocks();
});

describe('requireDoc', () => {
  it('accorde OWNER au propriétaire de l’espace', async () => {
    docFindUnique.mockResolvedValue({ id: 'd1', workspaceId: 'w1', workspace: { ownerId: 'owner' } });
    const access = await requireDoc('owner', 'd1', 'write');
    expect(access.role).toBe('OWNER');
  });

  it('accorde le rôle du membre d’espace même sans partage direct', async () => {
    docFindUnique.mockResolvedValue({ id: 'd1', workspaceId: 'w1', workspace: { ownerId: 'owner' } });
    workspaceMembershipFindUnique.mockResolvedValue({ role: 'EDITOR' });
    docMembershipFindUnique.mockResolvedValue(null);
    const access = await requireDoc('member', 'd1', 'write');
    expect(access.role).toBe('EDITOR');
  });

  it('prend le rôle le plus fort entre espace et module', async () => {
    docFindUnique.mockResolvedValue({ id: 'd1', workspaceId: 'w1', workspace: { ownerId: 'owner' } });
    workspaceMembershipFindUnique.mockResolvedValue({ role: 'VIEWER' });
    docMembershipFindUnique.mockResolvedValue({ role: 'EDITOR' });
    const access = await requireDoc('member', 'd1', 'write');
    expect(access.role).toBe('EDITOR');
  });

  it('refuse une écriture à un VIEWER (403)', async () => {
    docFindUnique.mockResolvedValue({ id: 'd1', workspaceId: 'w1', workspace: { ownerId: 'owner' } });
    workspaceMembershipFindUnique.mockResolvedValue(null);
    docMembershipFindUnique.mockResolvedValue({ role: 'VIEWER' });
    await expect(requireDoc('viewer', 'd1', 'write')).rejects.toMatchObject({ status: 403 });
  });

  it('renvoie 404 à un utilisateur sans aucun accès', async () => {
    docFindUnique.mockResolvedValue({ id: 'd1', workspaceId: 'w1', workspace: { ownerId: 'owner' } });
    workspaceMembershipFindUnique.mockResolvedValue(null);
    docMembershipFindUnique.mockResolvedValue(null);
    await expect(requireDoc('stranger', 'd1', 'read')).rejects.toMatchObject({ status: 404 });
  });
});

describe('requireWhiteboard', () => {
  it('accorde l’accès via le partage direct du module', async () => {
    whiteboardFindUnique.mockResolvedValue({ id: 'wb1', workspaceId: 'w1', workspace: { ownerId: 'owner' } });
    workspaceMembershipFindUnique.mockResolvedValue(null);
    whiteboardMembershipFindUnique.mockResolvedValue({ role: 'EDITOR' });
    const access = await requireWhiteboard('member', 'wb1', 'write');
    expect(access.role).toBe('EDITOR');
  });
});

describe('requireBoard', () => {
  it('accorde l’accès via l’appartenance à l’espace', async () => {
    boardFindUnique.mockResolvedValue({
      id: 'b1',
      workspaceId: 'w1',
      trelloId: null,
      workspace: { ownerId: 'owner' },
    });
    workspaceMembershipFindUnique.mockResolvedValue({ role: 'EDITOR' });
    boardMembershipFindUnique.mockResolvedValue(null);
    const access = await requireBoard('member', 'b1', 'write');
    expect(access.role).toBe('EDITOR');
  });

  it('renvoie 404 si aucun accès', async () => {
    boardFindUnique.mockResolvedValue({
      id: 'b1',
      workspaceId: 'w1',
      trelloId: null,
      workspace: { ownerId: 'owner' },
    });
    workspaceMembershipFindUnique.mockResolvedValue(null);
    boardMembershipFindUnique.mockResolvedValue(null);
    await expect(requireBoard('stranger', 'b1', 'read')).rejects.toMatchObject({ status: 404 });
  });
});
