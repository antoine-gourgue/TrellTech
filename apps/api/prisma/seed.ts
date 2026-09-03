import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { POSITION_STEP } from '../src/lib/position.js';

const prisma = new PrismaClient();

const DEMO_PASSWORD_HASH = bcrypt.hashSync('password123', 12);

const DOC_BLOCKS = [
  { type: 'heading', props: { level: 1 }, content: [{ type: 'text', text: 'Bienvenue', styles: {} }] },
  {
    type: 'paragraph',
    props: {},
    content: [{ type: 'text', text: 'Ce document de démonstration est éditable.', styles: {} }],
  },
  { type: 'bulletListItem', props: {}, content: [{ type: 'text', text: 'Premier point', styles: {} }] },
  { type: 'bulletListItem', props: {}, content: [{ type: 'text', text: 'Deuxième point', styles: {} }] },
];

const WHITEBOARD_SCENE = {
  elements: [
    {
      id: 'demo-rect',
      type: 'rectangle',
      x: 120,
      y: 80,
      width: 200,
      height: 120,
      strokeColor: '#1e1e1e',
      backgroundColor: '#a5d8ff',
    },
  ],
  appState: { viewBackgroundColor: '#ffffff' },
  files: {},
};

async function main(): Promise<void> {
  const user = await prisma.user.upsert({
    where: { id: 'demo-user' },
    create: {
      id: 'demo-user',
      username: 'demo',
      fullName: 'Utilisateur Démo',
      email: 'demo@trelltech.local',
      passwordHash: DEMO_PASSWORD_HASH,
      trelloToken: 'demo-local-token-not-real',
    },
    update: { passwordHash: DEMO_PASSWORD_HASH },
  });

  const collaborator = await prisma.user.upsert({
    where: { id: 'demo-collab' },
    create: {
      id: 'demo-collab',
      username: 'camille',
      fullName: 'Camille Collab',
      email: 'camille@trelltech.local',
      avatarUrl: null,
      passwordHash: DEMO_PASSWORD_HASH,
      trelloToken: 'demo-collab-token-not-real',
    },
    update: { passwordHash: DEMO_PASSWORD_HASH },
  });

  await prisma.workspace.deleteMany({ where: { ownerId: user.id } });

  const workspace = await prisma.workspace.create({
    data: {
      name: 'espace-demo',
      displayName: 'Espace Démo',
      description: 'Workspace de démonstration pour développer sans Trello.',
      ownerId: user.id,
    },
  });

  const board = await prisma.board.create({
    data: {
      workspaceId: workspace.id,
      name: 'Projet TrellTech',
      description: 'Tableau de démonstration.',
      background: '#0079bf',
      memberships: { create: { userId: collaborator.id, role: 'EDITOR' } },
    },
  });

  const [labelUrgent, labelFeature, labelBug] = await Promise.all([
    prisma.label.create({ data: { boardId: board.id, name: 'Urgent', color: 'red' } }),
    prisma.label.create({ data: { boardId: board.id, name: 'Fonctionnalité', color: 'green' } }),
    prisma.label.create({ data: { boardId: board.id, name: 'Bug', color: 'orange' } }),
  ]);

  const listNames = ['À faire', 'En cours', 'Terminé'];
  const lists = [];
  for (let i = 0; i < listNames.length; i += 1) {
    const list = await prisma.list.create({
      data: {
        boardId: board.id,
        name: listNames[i] as string,
        position: POSITION_STEP * (i + 1),
      },
    });
    lists.push(list);
  }

  const todo = lists[0]!;
  const doing = lists[1]!;
  const done = lists[2]!;

  const richCard = await prisma.card.create({
    data: {
      listId: doing.id,
      name: 'Implémenter la modale de carte',
      description: 'Checklist, commentaires, pièces jointes et membres.',
      position: POSITION_STEP,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      labels: { connect: [{ id: labelUrgent.id }, { id: labelFeature.id }] },
      members: { connect: [{ id: collaborator.id }] },
    },
  });

  const checklist = await prisma.checklist.create({
    data: { cardId: richCard.id, name: 'Sous-tâches', position: POSITION_STEP },
  });
  await prisma.checklistItem.createMany({
    data: [
      { checklistId: checklist.id, name: 'Maquette validée', checked: true, position: POSITION_STEP },
      { checklistId: checklist.id, name: 'Endpoints prêts', checked: true, position: POSITION_STEP * 2 },
      { checklistId: checklist.id, name: 'Tests écrits', checked: false, position: POSITION_STEP * 3 },
    ],
  });

  await prisma.comment.create({
    data: {
      cardId: richCard.id,
      authorId: collaborator.id,
      text: 'J’ai avancé sur la partie temps réel, à relire !',
    },
  });

  await prisma.attachment.create({
    data: {
      cardId: richCard.id,
      name: 'Aperçu maquette',
      url: 'https://picsum.photos/seed/trelltech/640/360',
      mime: 'image/jpeg',
      isCover: true,
    },
  });

  await prisma.activity.create({
    data: { cardId: richCard.id, userId: user.id, type: 'card_created' },
  });

  await prisma.card.create({
    data: {
      listId: todo.id,
      name: 'Corriger le drag & drop',
      position: POSITION_STEP,
      labels: { connect: [{ id: labelBug.id }] },
    },
  });
  await prisma.card.create({
    data: { listId: todo.id, name: 'Écrire la documentation', position: POSITION_STEP * 2 },
  });
  await prisma.card.create({
    data: {
      listId: done.id,
      name: 'Configurer le projet',
      position: POSITION_STEP,
      dueComplete: true,
      dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
  });

  const sharedDoc = await prisma.doc.create({
    data: {
      workspaceId: workspace.id,
      title: 'Notes de projet',
      icon: '📝',
      blocks: DOC_BLOCKS,
      position: POSITION_STEP,
      createdById: user.id,
      memberships: { create: { userId: collaborator.id, role: 'EDITOR' } },
    },
  });

  const sharedWhiteboard = await prisma.whiteboard.create({
    data: {
      workspaceId: workspace.id,
      title: 'Brainstorming',
      scene: WHITEBOARD_SCENE,
      position: POSITION_STEP,
      createdById: user.id,
      memberships: { create: { userId: collaborator.id, role: 'VIEWER' } },
    },
  });

  const sharedWorkspace = await prisma.workspace.create({
    data: {
      name: 'espace-partage',
      displayName: 'Espace Partagé',
      description: 'Espace dont Camille est membre plein.',
      ownerId: user.id,
      memberships: { create: { userId: collaborator.id, role: 'EDITOR' } },
      boards: { create: { name: 'Roadmap partagée', background: '#4bbf6b' } },
      docs: {
        create: {
          title: 'Compte-rendu',
          blocks: DOC_BLOCKS,
          position: POSITION_STEP,
          createdById: user.id,
        },
      },
    },
  });

  console.log(
    'Seed terminé : user=%s workspace=%s board=%s sharedWorkspace=%s sharedDoc=%s sharedWhiteboard=%s',
    user.id,
    workspace.id,
    board.id,
    sharedWorkspace.id,
    sharedDoc.id,
    sharedWhiteboard.id,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
