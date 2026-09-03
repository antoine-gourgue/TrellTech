import type { FastifyInstance } from 'fastify';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import {
  CreateShareLinkInput,
  CreateWhiteboardInput,
  ShareBoardInput,
  UpdateBoardMemberInput,
  UpdateWhiteboardInput,
} from '@trelltech/shared';
import { prisma } from '../../prisma.js';
import { env } from '../../env.js';
import { BadRequest, Forbidden, NotFound } from '../../lib/errors.js';
import { requireAuth } from '../../lib/session.js';
import { requireWhiteboard, requireWorkspaceAccess } from '../../lib/access.js';
import {
  buildMembers,
  publicUserSelect,
  serializeMember,
  serializeWhiteboard,
} from '../../lib/serialize.js';
import { positionAtEnd } from '../../lib/position.js';
import { EMPTY_WHITEBOARD_SCENE } from '../../lib/content.js';
import { signShareToken } from '../../lib/share-token.js';

const IdParams = z.object({ id: z.string().min(1) });
const MemberParams = z.object({ id: z.string().min(1), userId: z.string().min(1) });

async function requireWhiteboardOwner(userId: string, whiteboardId: string) {
  const whiteboard = await prisma.whiteboard.findUnique({
    where: { id: whiteboardId },
    select: { id: true, workspaceId: true, workspace: { select: { owner: { select: publicUserSelect } } } },
  });
  if (!whiteboard) throw NotFound('Tableau blanc introuvable');
  const owner = whiteboard.workspace.owner;
  if (owner.id !== userId)
    throw Forbidden('Seul le propriétaire peut gérer le partage de ce tableau blanc');
  return { whiteboard, owner };
}

export async function registerWhiteboardRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/whiteboards/:id', async (request) => {
    const user = await requireAuth(request);
    const { id } = IdParams.parse(request.params);
    await requireWhiteboard(user.id, id, 'read');
    const whiteboard = await prisma.whiteboard.findUniqueOrThrow({ where: { id } });
    return serializeWhiteboard(whiteboard);
  });

  app.post('/api/whiteboards', async (request, reply) => {
    const user = await requireAuth(request);
    const input = CreateWhiteboardInput.parse(request.body);
    await requireWorkspaceAccess(user.id, input.workspaceId, 'write');

    const last = await prisma.whiteboard.findFirst({
      where: { workspaceId: input.workspaceId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const whiteboard = await prisma.whiteboard.create({
      data: {
        workspaceId: input.workspaceId,
        title: input.title?.trim() || 'Sans titre',
        scene: EMPTY_WHITEBOARD_SCENE,
        position: positionAtEnd(last?.position ?? null),
        createdById: user.id,
      },
    });
    return reply.status(201).send(serializeWhiteboard(whiteboard));
  });

  app.patch('/api/whiteboards/:id', async (request) => {
    const user = await requireAuth(request);
    const { id } = IdParams.parse(request.params);
    const input = UpdateWhiteboardInput.parse(request.body);
    await requireWhiteboard(user.id, id, 'write');

    const whiteboard = await prisma.whiteboard.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.scene !== undefined ? { scene: input.scene as Prisma.InputJsonValue } : {}),
      },
    });
    return serializeWhiteboard(whiteboard);
  });

  app.delete('/api/whiteboards/:id', async (request, reply) => {
    const user = await requireAuth(request);
    const { id } = IdParams.parse(request.params);
    const access = await requireWhiteboard(user.id, id, 'write');
    if (access.role !== 'OWNER')
      throw Forbidden('Seul le propriétaire peut supprimer ce tableau blanc');
    await prisma.whiteboard.delete({ where: { id } });
    return reply.status(204).send();
  });

  app.get('/api/whiteboards/:id/members', async (request) => {
    const user = await requireAuth(request);
    const { id } = IdParams.parse(request.params);
    await requireWhiteboard(user.id, id, 'read');
    const whiteboard = await prisma.whiteboard.findUnique({
      where: { id },
      select: {
        workspace: { select: { owner: { select: publicUserSelect } } },
        memberships: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: publicUserSelect } },
        },
      },
    });
    if (!whiteboard) throw NotFound('Tableau blanc introuvable');
    return buildMembers(whiteboard.workspace.owner, whiteboard.memberships);
  });

  app.post('/api/whiteboards/:id/members', async (request, reply) => {
    const user = await requireAuth(request);
    const { id } = IdParams.parse(request.params);
    const input = ShareBoardInput.parse(request.body);
    const { owner } = await requireWhiteboardOwner(user.id, id);

    const target = await prisma.user.findFirst({
      where: { OR: [{ id: input.userQuery }, { username: input.userQuery }] },
      select: { ...publicUserSelect },
    });
    if (!target) throw NotFound('Utilisateur introuvable');
    if (target.id === owner.id)
      throw BadRequest('Cet utilisateur est déjà propriétaire du tableau blanc');

    const membership = await prisma.whiteboardMembership.upsert({
      where: { whiteboardId_userId: { whiteboardId: id, userId: target.id } },
      create: { whiteboardId: id, userId: target.id, role: input.role },
      update: { role: input.role },
      include: { user: { select: publicUserSelect } },
    });
    return reply.status(201).send(serializeMember(membership.user, membership.role));
  });

  app.patch('/api/whiteboards/:id/members/:userId', async (request) => {
    const user = await requireAuth(request);
    const { id, userId } = MemberParams.parse(request.params);
    const input = UpdateBoardMemberInput.parse(request.body);
    await requireWhiteboardOwner(user.id, id);

    const existing = await prisma.whiteboardMembership.findUnique({
      where: { whiteboardId_userId: { whiteboardId: id, userId } },
      select: { id: true },
    });
    if (!existing) throw NotFound('Membre introuvable');

    const membership = await prisma.whiteboardMembership.update({
      where: { whiteboardId_userId: { whiteboardId: id, userId } },
      data: { role: input.role },
      include: { user: { select: publicUserSelect } },
    });
    return serializeMember(membership.user, membership.role);
  });

  app.delete('/api/whiteboards/:id/members/:userId', async (request, reply) => {
    const user = await requireAuth(request);
    const { id, userId } = MemberParams.parse(request.params);
    await requireWhiteboardOwner(user.id, id);

    const existing = await prisma.whiteboardMembership.findUnique({
      where: { whiteboardId_userId: { whiteboardId: id, userId } },
      select: { id: true },
    });
    if (!existing) throw NotFound('Membre introuvable');

    await prisma.whiteboardMembership.delete({
      where: { whiteboardId_userId: { whiteboardId: id, userId } },
    });
    return reply.status(204).send();
  });

  app.get('/api/whiteboards/:id/share-link', async (request) => {
    const user = await requireAuth(request);
    const { id } = IdParams.parse(request.params);
    const { role } = CreateShareLinkInput.parse(request.query);
    await requireWhiteboardOwner(user.id, id);

    const token = signShareToken('whiteboard', id, role);
    return { token, role, url: `${env.WEB_ORIGIN}/join/${token}` };
  });
}
