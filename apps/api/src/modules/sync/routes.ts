import type { FastifyInstance } from 'fastify';
import { trelloConfigured } from '../../env.js';
import { BadRequest, HttpError } from '../../lib/errors.js';
import { requireAuth } from '../../lib/session.js';
import { importFromTrello } from './import.js';

export async function registerSyncRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/sync/trello', async (request) => {
    const user = await requireAuth(request);
    if (!user.trelloToken) {
      throw BadRequest('Liez d’abord votre compte Trello');
    }
    if (!trelloConfigured()) {
      throw new HttpError(
        503,
        'TRELLO_NOT_CONFIGURED',
        'La synchronisation Trello n’est pas configurée sur le serveur',
      );
    }
    const summary = await importFromTrello(user);
    return { imported: summary };
  });
}
