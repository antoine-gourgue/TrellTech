import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { env, trelloConfigured } from './env.js';
import { registerErrorHandler } from './lib/errors.js';
import { registerAuthRoutes } from './modules/auth/routes.js';
import { registerWorkspaceRoutes } from './modules/workspaces/routes.js';
import { registerBoardRoutes } from './modules/boards/routes.js';
import { registerListRoutes } from './modules/lists/routes.js';
import { registerCardRoutes } from './modules/cards/routes.js';
import { registerLabelRoutes } from './modules/labels/routes.js';
import { registerChecklistRoutes } from './modules/checklists/routes.js';
import { registerCommentRoutes } from './modules/comments/routes.js';
import { registerAttachmentRoutes } from './modules/attachments/routes.js';
import { registerNotificationRoutes } from './modules/notifications/routes.js';
import { registerDocRoutes } from './modules/docs/routes.js';
import { registerWhiteboardRoutes } from './modules/whiteboards/routes.js';
import { registerShareRoutes } from './modules/share/routes.js';
import { registerSearchRoutes } from './modules/search/routes.js';
import { registerRealtimeRoutes } from './modules/realtime/routes.js';
import { registerWebhookRoutes } from './modules/webhooks/routes.js';
import { registerSyncRoutes } from './modules/sync/routes.js';

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: env.NODE_ENV === 'test' ? false : { level: 'info' },
  });

  await app.register(cookie, { secret: env.SESSION_SECRET });
  await app.register(cors, { origin: env.WEB_ORIGIN, credentials: true });
  await app.register(websocket);

  registerErrorHandler(app);

  app.get('/api/health', async () => ({
    status: 'ok',
    trelloConfigured: trelloConfigured(),
    timestamp: new Date().toISOString(),
  }));

  await app.register(registerAuthRoutes);
  await app.register(registerWorkspaceRoutes);
  await app.register(registerBoardRoutes);
  await app.register(registerListRoutes);
  await app.register(registerCardRoutes);
  await app.register(registerLabelRoutes);
  await app.register(registerChecklistRoutes);
  await app.register(registerCommentRoutes);
  await app.register(registerAttachmentRoutes);
  await app.register(registerNotificationRoutes);
  await app.register(registerDocRoutes);
  await app.register(registerWhiteboardRoutes);
  await app.register(registerShareRoutes);
  await app.register(registerSearchRoutes);
  await app.register(registerRealtimeRoutes);
  await app.register(registerWebhookRoutes);
  await app.register(registerSyncRoutes);

  return app;
}
