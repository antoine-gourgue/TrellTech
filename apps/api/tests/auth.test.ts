import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://trelltech:trelltech@localhost:5432/trelltech?schema=public';
process.env.SESSION_SECRET = 'test_session_secret_at_least_16_chars';

const findUnique = vi.fn();
const findFirst = vi.fn();
const create = vi.fn();
const update = vi.fn();

vi.mock('../src/prisma.js', () => ({
  prisma: {
    user: { findUnique, findFirst, create, update },
  },
}));

const { buildServer } = await import('../src/server.js');
type App = Awaited<ReturnType<typeof buildServer>>;

let app: App;

const now = new Date('2026-01-01T00:00:00.000Z');
const PASSWORD = 'password123';
const passwordHash = bcrypt.hashSync(PASSWORD, 10);

function baseUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    trelloId: null,
    username: 'demo',
    fullName: null,
    email: 'demo@x.io',
    passwordHash,
    avatarUrl: null,
    trelloToken: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

beforeAll(async () => {
  app = await buildServer();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  findUnique.mockReset();
  findFirst.mockReset();
  create.mockReset();
  update.mockReset();
});

describe('POST /api/auth/register', () => {
  it('crée un compte, pose la session et ne fuite aucun secret', async () => {
    findUnique.mockResolvedValue(null);
    findFirst.mockResolvedValue(null);
    create.mockResolvedValue(baseUser({ email: 'new@x.io', username: 'new', passwordHash }));

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'new@x.io', password: PASSWORD },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body).toMatchObject({ hasPassword: true, trelloLinked: false });
    expect(body).not.toHaveProperty('passwordHash');
    expect(body).not.toHaveProperty('trelloToken');
    expect(res.headers['set-cookie']).toBeDefined();
    const created = create.mock.calls[0]![0].data;
    expect(created.email).toBe('new@x.io');
    expect(created.passwordHash).not.toBe(PASSWORD);
    expect(created.username).toBe('new');
  });

  it('renvoie 409 si l’email est déjà pris', async () => {
    findUnique.mockResolvedValue({ id: 'existing' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'taken@x.io', password: PASSWORD },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('EMAIL_TAKEN');
    expect(create).not.toHaveBeenCalled();
  });

  it('refuse un mot de passe trop court (validation)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'short@x.io', password: 'abc' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('accepte les bons identifiants et pose la session', async () => {
    findUnique.mockResolvedValue(baseUser());

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'demo@x.io', password: PASSWORD },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ id: 'user-1', hasPassword: true });
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('renvoie 401 générique sur mauvais mot de passe', async () => {
    findUnique.mockResolvedValue(baseUser());

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'demo@x.io', password: 'wrongpassword' },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('UNAUTHORIZED');
  });

  it('renvoie 401 générique sur email inconnu (indistinct)', async () => {
    findUnique.mockResolvedValue(null);

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'unknown@x.io', password: PASSWORD },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('UNAUTHORIZED');
  });
});

describe('GET /api/auth/me', () => {
  it('expose trelloLinked/hasPassword sans jamais fuiter les secrets', async () => {
    findUnique.mockResolvedValue(
      baseUser({ trelloId: 'trello-1', trelloToken: 'secret-trello-token', passwordHash }),
    );

    const signed = app.signCookie('user-1');
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      cookies: { tt_session: signed },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toMatchObject({ trelloLinked: true, hasPassword: true });
    expect(JSON.stringify(body)).not.toContain('secret-trello-token');
    expect(body).not.toHaveProperty('passwordHash');
    expect(body).not.toHaveProperty('trelloToken');
  });

  it('renvoie 401 sans session', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/me' });
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /api/auth/trello/unlink', () => {
  it('détache le compte Trello et renvoie trelloLinked=false', async () => {
    findUnique.mockResolvedValue(baseUser({ trelloId: 'trello-1', trelloToken: 'tok' }));
    update.mockResolvedValue(baseUser({ trelloId: null, trelloToken: null }));

    const signed = app.signCookie('user-1');
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/trello/unlink',
      cookies: { tt_session: signed },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ trelloLinked: false });
    expect(update.mock.calls[0]![0].data).toMatchObject({ trelloId: null, trelloToken: null });
  });
});

describe('POST /api/sync/trello', () => {
  it('renvoie 400 si aucun token Trello n’est lié', async () => {
    findUnique.mockResolvedValue(baseUser({ trelloToken: null }));

    const signed = app.signCookie('user-1');
    const res = await app.inject({
      method: 'POST',
      url: '/api/sync/trello',
      cookies: { tt_session: signed },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('BAD_REQUEST');
  });
});
