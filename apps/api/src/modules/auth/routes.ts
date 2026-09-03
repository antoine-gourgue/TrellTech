import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { LoginInput, RegisterInput } from '@trelltech/shared';
import { z } from 'zod';
import { env, trelloConfigured } from '../../env.js';
import { prisma } from '../../prisma.js';
import { BadRequest, HttpError, Unauthorized } from '../../lib/errors.js';
import { clearSession, requireAuth, setSession } from '../../lib/session.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { createRateLimiter } from '../../lib/rate-limit.js';
import { serializeUser } from '../../lib/serialize.js';
import { TrelloClient } from '../trello/client.js';

const SessionInput = z.object({
  token: z.string().min(1, 'Token Trello manquant'),
});

const registerLimiter = createRateLimiter('register', 10, 15 * 60 * 1000);
const loginLimiter = createRateLimiter('login', 10, 15 * 60 * 1000);

function callbackPage(): string {
  return `<!doctype html>
<html lang="fr">
  <head><meta charset="utf-8" /><title>Connexion Trello…</title></head>
  <body>
    <p>Finalisation de la connexion…</p>
    <script>
      (function () {
        var hash = window.location.hash || '';
        var match = hash.match(/token=([^&]+)/);
        if (!match) {
          document.body.innerText = 'Aucun token reçu de Trello.';
          return;
        }
        fetch('/api/auth/trello/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ token: decodeURIComponent(match[1]) }),
        })
          .then(function (r) {
            if (!r.ok) throw new Error('session');
            window.location.replace(${JSON.stringify(env.WEB_ORIGIN)});
          })
          .catch(function () {
            document.body.innerText = 'Échec de la liaison Trello.';
          });
      })();
    </script>
  </body>
</html>`;
}

function usernameFromEmail(email: string): string {
  const base = email.split('@')[0]?.replace(/[^a-z0-9._-]/gi, '') ?? '';
  return base.length > 0 ? base.toLowerCase() : 'user';
}

async function uniqueUsername(base: string): Promise<string> {
  let candidate = base;
  let suffix = 1;
  while (await prisma.user.findFirst({ where: { username: candidate }, select: { id: true } })) {
    suffix += 1;
    candidate = `${base}${suffix}`;
  }
  return candidate;
}

function trelloAuthorizeUrl(): string {
  if (!trelloConfigured()) {
    throw new HttpError(
      503,
      'TRELLO_NOT_CONFIGURED',
      'La connexion Trello n’est pas configurée sur le serveur',
    );
  }
  const url = new URL('https://trello.com/1/authorize');
  url.searchParams.set('expiration', 'never');
  url.searchParams.set('scope', 'read,write');
  url.searchParams.set('response_type', 'token');
  url.searchParams.set('name', 'TrellTech');
  url.searchParams.set('key', env.TRELLO_API_KEY as string);
  url.searchParams.set('return_url', env.TRELLO_OAUTH_CALLBACK_URL);
  url.searchParams.set('callback_method', 'fragment');
  return url.toString();
}

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/auth/register', async (request, reply) => {
    registerLimiter(request);
    const { email, password, fullName } = RegisterInput.parse(request.body);

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      throw new HttpError(409, 'EMAIL_TAKEN', 'Un compte existe déjà avec cet email');
    }

    const username = await uniqueUsername(usernameFromEmail(email));
    const passwordHash = await hashPassword(password);

    try {
      const user = await prisma.user.create({
        data: { email, passwordHash, username, fullName: fullName ?? null },
      });
      setSession(reply, user.id);
      return reply.status(201).send(serializeUser(user));
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new HttpError(409, 'EMAIL_TAKEN', 'Un compte existe déjà avec cet email');
      }
      throw err;
    }
  });

  app.post('/api/auth/login', async (request, reply) => {
    loginLimiter(request);
    const { email, password } = LoginInput.parse(request.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      throw Unauthorized('Email ou mot de passe incorrect');
    }

    setSession(reply, user.id);
    return reply.send(serializeUser(user));
  });

  app.get('/api/auth/me', async (request) => {
    const user = await requireAuth(request);
    return serializeUser(user);
  });

  app.post('/api/auth/logout', async (request, reply) => {
    clearSession(reply);
    request.currentUser = undefined;
    return reply.status(204).send();
  });

  app.get('/api/auth/status', async (request) => {
    const raw = request.cookies['tt_session'];
    return { authenticated: Boolean(raw), trelloConfigured: trelloConfigured() };
  });

  app.get('/api/auth/trello/link', async (request, reply) => {
    await requireAuth(request);
    return reply.redirect(trelloAuthorizeUrl());
  });

  app.get('/api/auth/trello/login', async (request, reply) => {
    await requireAuth(request);
    return reply.redirect(trelloAuthorizeUrl());
  });

  app.get('/api/auth/trello/callback', async (_request, reply) => {
    return reply.type('text/html').send(callbackPage());
  });

  app.post('/api/auth/trello/session', async (request, reply) => {
    const currentUser = await requireAuth(request);
    const { token } = SessionInput.parse(request.body);
    const client = new TrelloClient(token);
    const member = await client.me().catch(() => {
      throw BadRequest('Token Trello invalide');
    });

    const owner = await prisma.user.findUnique({
      where: { trelloId: member.id },
      select: { id: true },
    });
    if (owner && owner.id !== currentUser.id) {
      throw new HttpError(409, 'TRELLO_ALREADY_LINKED', 'Ce compte Trello est déjà lié à un autre utilisateur');
    }

    const user = await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        trelloId: member.id,
        trelloToken: token,
        avatarUrl: member.avatarUrl ?? currentUser.avatarUrl,
      },
    });

    return reply.send(serializeUser(user));
  });

  app.post('/api/auth/trello/unlink', async (request, reply) => {
    const currentUser = await requireAuth(request);
    const user = await prisma.user.update({
      where: { id: currentUser.id },
      data: { trelloId: null, trelloToken: null },
    });
    return reply.send(serializeUser(user));
  });
}
