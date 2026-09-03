import type { FastifyInstance } from 'fastify';
import type { BoardRole } from '@prisma/client';
import { z } from 'zod';
import {
  CreateShareLinkInput,
  CreateWorkspaceInput,
  ShareBoardInput,
  UpdateBoardMemberInput,
  UpdateWorkspaceInput,
} from '@trelltech/shared';
import { prisma } from '../../prisma.js';
import { env } from '../../env.js';
import { BadRequest, NotFound } from '../../lib/errors.js';
import { requireAuth } from '../../lib/session.js';
import { requireOwnedWorkspace, requireWorkspaceAccess } from '../../lib/access.js';
import {
  buildMembers,
  publicUserSelect,
  serializeMember,
  serializeWorkspace,
  serializeWorkspaceWithContent,
} from '../../lib/serialize.js';
import { signShareToken } from '../../lib/share-token.js';
import { pushWorkspaceCreated } from '../sync/push.js';

const IdParams = z.object({ id: z.string().min(1) });
const MemberParams = z.object({ id: z.string().min(1), userId: z.string().min(1) });

const contentInclude = {
  boards: { where: { closed: false }, orderBy: { createdAt: 'asc' } },
  docs: { orderBy: { position: 'asc' } },
  whiteboards: { orderBy: { position: 'asc' } },
} as const;

async function loadWorkspaceMembers(workspaceId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      owner: { select: publicUserSelect },
      memberships: {
        orderBy: { createdAt: 'asc' },
        include: { user: { select: publicUserSelect } },
      },
    },
  });
  if (!workspace) throw NotFound('Workspace introuvable');
  return buildMembers(workspace.owner, workspace.memberships);
}

export async function registerWorkspaceRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/workspaces', async (request) => {
    const user = await requireAuth(request);
    const [owned, memberships] = await Promise.all([
      prisma.workspace.findMany({
        where: { ownerId: user.id },
        orderBy: { createdAt: 'asc' },
        include: contentInclude,
      }),
      prisma.workspaceMembership.findMany({
        where: { userId: user.id, workspace: { ownerId: { not: user.id } } },
        orderBy: { workspace: { createdAt: 'asc' } },
        include: { workspace: { include: contentInclude } },
      }),
    ]);

    const result = [
      ...owned.map((ws) => serializeWorkspaceWithContent(ws, 'OWNER' as BoardRole)),
      ...memberships.map((m) => serializeWorkspaceWithContent(m.workspace, m.role)),
    ];
    return result;
  });

  app.post('/api/workspaces', async (request, reply) => {
    const user = await requireAuth(request);
    const input = CreateWorkspaceInput.parse(request.body);
    const workspace = await prisma.workspace.create({
      data: {
        name: input.displayName.toLowerCase().replace(/\s+/g, '-'),
        displayName: input.displayName,
        description: input.description ?? null,
        ownerId: user.id,
      },
    });
    pushWorkspaceCreated(user, workspace, request.log);
    return reply.status(201).send(serializeWorkspace(workspace));
  });

  app.patch('/api/workspaces/:id', async (request) => {
    const user = await requireAuth(request);
    const { id } = IdParams.parse(request.params);
    const input = UpdateWorkspaceInput.parse(request.body);

    await requireOwnedWorkspace(user.id, id);

    const workspace = await prisma.workspace.update({
      where: { id },
      data: {
        ...(input.displayName !== undefined
          ? { displayName: input.displayName, name: input.displayName.toLowerCase().replace(/\s+/g, '-') }
          : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
      },
    });
    return serializeWorkspace(workspace);
  });

  app.delete('/api/workspaces/:id', async (request, reply) => {
    const user = await requireAuth(request);
    const { id } = IdParams.parse(request.params);
    await requireOwnedWorkspace(user.id, id);
    await prisma.workspace.delete({ where: { id } });
    return reply.status(204).send();
  });

  app.get('/api/workspaces/:id/members', async (request) => {
    const user = await requireAuth(request);
    const { id } = IdParams.parse(request.params);
    await requireWorkspaceAccess(user.id, id, 'read');
    return loadWorkspaceMembers(id);
  });

  app.post('/api/workspaces/:id/members', async (request, reply) => {
    const user = await requireAuth(request);
    const { id } = IdParams.parse(request.params);
    const input = ShareBoardInput.parse(request.body);
    await requireOwnedWorkspace(user.id, id);

    const target = await prisma.user.findFirst({
      where: { OR: [{ id: input.userQuery }, { username: input.userQuery }] },
      select: { ...publicUserSelect },
    });
    if (!target) throw NotFound('Utilisateur introuvable');
    if (target.id === user.id) throw BadRequest('Vous êtes déjà propriétaire de cet espace');

    const membership = await prisma.workspaceMembership.upsert({
      where: { workspaceId_userId: { workspaceId: id, userId: target.id } },
      create: { workspaceId: id, userId: target.id, role: input.role },
      update: { role: input.role },
      include: { user: { select: publicUserSelect } },
    });
    return reply.status(201).send(serializeMember(membership.user, membership.role));
  });

  app.patch('/api/workspaces/:id/members/:userId', async (request) => {
    const user = await requireAuth(request);
    const { id, userId } = MemberParams.parse(request.params);
    const input = UpdateBoardMemberInput.parse(request.body);
    await requireOwnedWorkspace(user.id, id);

    const existing = await prisma.workspaceMembership.findUnique({
      where: { workspaceId_userId: { workspaceId: id, userId } },
      select: { id: true },
    });
    if (!existing) throw NotFound('Membre introuvable');

    const membership = await prisma.workspaceMembership.update({
      where: { workspaceId_userId: { workspaceId: id, userId } },
      data: { role: input.role },
      include: { user: { select: publicUserSelect } },
    });
    return serializeMember(membership.user, membership.role);
  });

  app.delete('/api/workspaces/:id/members/:userId', async (request, reply) => {
    const user = await requireAuth(request);
    const { id, userId } = MemberParams.parse(request.params);
    await requireOwnedWorkspace(user.id, id);

    const existing = await prisma.workspaceMembership.findUnique({
      where: { workspaceId_userId: { workspaceId: id, userId } },
      select: { id: true },
    });
    if (!existing) throw NotFound('Membre introuvable');

    await prisma.workspaceMembership.delete({
      where: { workspaceId_userId: { workspaceId: id, userId } },
    });
    return reply.status(204).send();
  });

  app.get('/api/workspaces/:id/share-link', async (request) => {
    const user = await requireAuth(request);
    const { id } = IdParams.parse(request.params);
    const { role } = CreateShareLinkInput.parse(request.query);
    await requireOwnedWorkspace(user.id, id);

    const token = signShareToken('workspace', id, role);
    return { token, role, url: `${env.WEB_ORIGIN}/join/${token}` };
  });
}
