import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://trelltech:trelltech@localhost:5432/trelltech?schema=public';
process.env.SESSION_SECRET = 'test_session_secret_at_least_16_chars';

const findUnique = vi.fn();
const workspaceFindMany = vi.fn();
const workspaceMembershipFindMany = vi.fn();

vi.mock('../src/prisma.js', () => ({
  prisma: {
    user: { findUnique },
    workspace: { findMany: workspaceFindMany },
    workspaceMembership: { findMany: workspaceMembershipFindMany },
  },
}));

const { buildServer } = await import('../src/server.js');
type App = Awaited<ReturnType<typeof buildServer>>;

let app: App;

beforeAll(async () => {
  app = await buildServer();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('GET /api/health', () => {
  it('répond 200 avec un statut ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'ok' });
  });
});

describe('GET /api/workspaces', () => {
  it('renvoie 401 sans session', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/workspaces' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('UNAUTHORIZED');
  });

  it('renvoie les workspaces sérialisés avec une session valide', async () => {
    const now = new Date();
    findUnique.mockResolvedValue({
      id: 'user-1',
      trelloId: null,
      username: 'demo',
      fullName: null,
      email: null,
      avatarUrl: null,
      trelloToken: 'secret-token',
      createdAt: now,
      updatedAt: now,
    });
    workspaceMembershipFindMany.mockResolvedValue([]);
    workspaceFindMany.mockResolvedValue([
      {
        id: 'ws-1',
        trelloId: null,
        name: 'demo',
        displayName: 'Démo',
        description: null,
        ownerId: 'user-1',
        createdAt: now,
        updatedAt: now,
        syncedAt: null,
        boards: [],
        docs: [],
        whiteboards: [],
      },
    ]);

    const signed = app.signCookie('user-1');
    const res = await app.inject({
      method: 'GET',
      url: '/api/workspaces',
      cookies: { tt_session: signed },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({ id: 'ws-1', displayName: 'Démo', boards: [] });
    expect(JSON.stringify(body)).not.toContain('secret-token');
  });
});
