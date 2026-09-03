import type { FastifyInstance } from 'fastify';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import {
  CreateDocInput,
  CreateShareLinkInput,
  ShareBoardInput,
  UpdateBoardMemberInput,
  UpdateDocInput,
} from '@trelltech/shared';
import { prisma } from '../../prisma.js';
import { env } from '../../env.js';
import { BadRequest, Forbidden, NotFound } from '../../lib/errors.js';
import { requireAuth } from '../../lib/session.js';
import { requireDoc, requireWorkspaceAccess } from '../../lib/access.js';
import {
  buildMembers,
  publicUserSelect,
  serializeDoc,
  serializeMember,
} from '../../lib/serialize.js';
import { positionAtEnd } from '../../lib/position.js';
import { EMPTY_DOC_BLOCKS } from '../../lib/content.js';
import { signShareToken } from '../../lib/share-token.js';

const IdParams = z.object({ id: z.string().min(1) });
const MemberParams = z.object({ id: z.string().min(1), userId: z.string().min(1) });

async function requireDocOwner(userId: string, docId: string) {
  const doc = await prisma.doc.findUnique({
    where: { id: docId },
    select: { id: true, workspaceId: true, workspace: { select: { owner: { select: publicUserSelect } } } },
  });
  if (!doc) throw NotFound('Document introuvable');
  const owner = doc.workspace.owner;
  if (owner.id !== userId) throw Forbidden('Seul le propriétaire peut gérer le partage de ce document');
  return { doc, owner };
}

export async function registerDocRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/docs/:id', async (request) => {
    const user = await requireAuth(request);
    const { id } = IdParams.parse(request.params);
    await requireDoc(user.id, id, 'read');
    const doc = await prisma.doc.findUniqueOrThrow({ where: { id } });
    return serializeDoc(doc);
  });

  app.post('/api/docs', async (request, reply) => {
    const user = await requireAuth(request);
    const input = CreateDocInput.parse(request.body);
    await requireWorkspaceAccess(user.id, input.workspaceId, 'write');

    const last = await prisma.doc.findFirst({
      where: { workspaceId: input.workspaceId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const doc = await prisma.doc.create({
      data: {
        workspaceId: input.workspaceId,
        title: input.title?.trim() || 'Sans titre',
        icon: input.icon ?? null,
        blocks: EMPTY_DOC_BLOCKS,
        position: positionAtEnd(last?.position ?? null),
        createdById: user.id,
      },
    });
    return reply.status(201).send(serializeDoc(doc));
  });

  app.patch('/api/docs/:id', async (request) => {
    const user = await requireAuth(request);
    const { id } = IdParams.parse(request.params);
    const input = UpdateDocInput.parse(request.body);
    await requireDoc(user.id, id, 'write');

    const doc = await prisma.doc.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.icon !== undefined ? { icon: input.icon } : {}),
        ...(input.blocks !== undefined
          ? { blocks: input.blocks as Prisma.InputJsonValue }
          : {}),
      },
    });
    return serializeDoc(doc);
  });

  app.delete('/api/docs/:id', async (request, reply) => {
    const user = await requireAuth(request);
    const { id } = IdParams.parse(request.params);
    const access = await requireDoc(user.id, id, 'write');
    if (access.role !== 'OWNER') throw Forbidden('Seul le propriétaire peut supprimer ce document');
    await prisma.doc.delete({ where: { id } });
    return reply.status(204).send();
  });

  app.get('/api/docs/:id/members', async (request) => {
    const user = await requireAuth(request);
    const { id } = IdParams.parse(request.params);
    await requireDoc(user.id, id, 'read');
    const doc = await prisma.doc.findUnique({
      where: { id },
      select: {
        workspace: { select: { owner: { select: publicUserSelect } } },
        memberships: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: publicUserSelect } },
        },
      },
    });
    if (!doc) throw NotFound('Document introuvable');
    return buildMembers(doc.workspace.owner, doc.memberships);
  });

  app.post('/api/docs/:id/members', async (request, reply) => {
    const user = await requireAuth(request);
    const { id } = IdParams.parse(request.params);
    const input = ShareBoardInput.parse(request.body);
    const { owner } = await requireDocOwner(user.id, id);

    const target = await prisma.user.findFirst({
      where: { OR: [{ id: input.userQuery }, { username: input.userQuery }] },
      select: { ...publicUserSelect },
    });
    if (!target) throw NotFound('Utilisateur introuvable');
    if (target.id === owner.id) throw BadRequest('Cet utilisateur est déjà propriétaire du document');

    const membership = await prisma.docMembership.upsert({
      where: { docId_userId: { docId: id, userId: target.id } },
      create: { docId: id, userId: target.id, role: input.role },
      update: { role: input.role },
      include: { user: { select: publicUserSelect } },
    });
    return reply.status(201).send(serializeMember(membership.user, membership.role));
  });

  app.patch('/api/docs/:id/members/:userId', async (request) => {
    const user = await requireAuth(request);
    const { id, userId } = MemberParams.parse(request.params);
    const input = UpdateBoardMemberInput.parse(request.body);
    await requireDocOwner(user.id, id);

    const existing = await prisma.docMembership.findUnique({
      where: { docId_userId: { docId: id, userId } },
      select: { id: true },
    });
    if (!existing) throw NotFound('Membre introuvable');

    const membership = await prisma.docMembership.update({
      where: { docId_userId: { docId: id, userId } },
      data: { role: input.role },
      include: { user: { select: publicUserSelect } },
    });
    return serializeMember(membership.user, membership.role);
  });

  app.delete('/api/docs/:id/members/:userId', async (request, reply) => {
    const user = await requireAuth(request);
    const { id, userId } = MemberParams.parse(request.params);
    await requireDocOwner(user.id, id);

    const existing = await prisma.docMembership.findUnique({
      where: { docId_userId: { docId: id, userId } },
      select: { id: true },
    });
    if (!existing) throw NotFound('Membre introuvable');

    await prisma.docMembership.delete({
      where: { docId_userId: { docId: id, userId } },
    });
    return reply.status(204).send();
  });

  app.get('/api/docs/:id/share-link', async (request) => {
    const user = await requireAuth(request);
    const { id } = IdParams.parse(request.params);
    const { role } = CreateShareLinkInput.parse(request.query);
    await requireDocOwner(user.id, id);

    const token = signShareToken('doc', id, role);
    return { token, role, url: `${env.WEB_ORIGIN}/join/${token}` };
  });
}
