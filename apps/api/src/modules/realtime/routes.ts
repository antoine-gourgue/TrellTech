import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { resolveSessionUserId } from '../../lib/session.js';
import { requireBoard } from '../../lib/access.js';
import { subscribe, unsubscribe, unsubscribeEverywhere } from '../../lib/realtime.js';

const ClientMessage = z.union([
  z.object({ subscribe: z.string().min(1) }),
  z.object({ unsubscribe: z.string().min(1) }),
]);

export async function registerRealtimeRoutes(app: FastifyInstance): Promise<void> {
  app.get('/ws', { websocket: true }, (socket, request) => {
    const userId = resolveSessionUserId(request);
    if (!userId) {
      socket.close(1008, 'Non authentifié');
      return;
    }

    socket.on('message', (raw: Buffer | ArrayBuffer | Buffer[]) => {
      void (async () => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw.toString());
        } catch {
          return;
        }
        const message = ClientMessage.safeParse(parsed);
        if (!message.success) return;

        if ('subscribe' in message.data) {
          try {
            await requireBoard(userId, message.data.subscribe, 'read');
          } catch {
            return;
          }
          subscribe(message.data.subscribe, socket);
          return;
        }
        unsubscribe(message.data.unsubscribe, socket);
      })();
    });

    socket.on('close', () => unsubscribeEverywhere(socket));
  });
}
