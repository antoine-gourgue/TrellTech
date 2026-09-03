import { describe, expect, it } from 'vitest';
import { serializeCard, serializeUser } from '../src/lib/serialize.js';

const now = new Date('2026-01-01T00:00:00.000Z');

describe('serializeUser', () => {
  it('n’expose jamais le trelloToken ni le passwordHash', () => {
    const output = serializeUser({
      id: 'u1',
      trelloId: 'trello-1',
      username: 'demo',
      fullName: 'Démo',
      email: 'demo@x.io',
      passwordHash: 'super-secret-hash',
      avatarUrl: null,
      trelloToken: 'super-secret-token',
      createdAt: now,
      updatedAt: now,
    });
    const serialized = JSON.stringify(output);
    expect(serialized).not.toContain('super-secret-token');
    expect(serialized).not.toContain('super-secret-hash');
    expect(output).not.toHaveProperty('trelloToken');
    expect(output).not.toHaveProperty('passwordHash');
    expect(output).toMatchObject({
      id: 'u1',
      username: 'demo',
      trelloLinked: true,
      hasPassword: true,
    });
  });

  it('reflète l’absence de token Trello et de mot de passe', () => {
    const output = serializeUser({
      id: 'u2',
      trelloId: null,
      username: 'nolink',
      fullName: null,
      email: 'nolink@x.io',
      passwordHash: null,
      avatarUrl: null,
      trelloToken: null,
      createdAt: now,
      updatedAt: now,
    });
    expect(output.trelloLinked).toBe(false);
    expect(output.hasPassword).toBe(false);
  });
});

describe('serializeCard', () => {
  it('produit le nouveau contrat Card (labels objets, résumés, cover)', () => {
    const card = serializeCard({
      id: 'c1',
      trelloId: null,
      listId: 'l1',
      name: 'Ma carte',
      description: null,
      position: 65536,
      dueDate: now,
      dueComplete: false,
      closed: false,
      createdAt: now,
      updatedAt: now,
      labels: [{ id: 'lab1', boardId: 'b1', name: 'Urgent', color: 'red', trelloId: null }],
      members: [{ id: 'u2', username: 'camille', fullName: null, avatarUrl: null }],
      checklists: [{ items: [{ checked: true }, { checked: false }] }],
      attachments: [{ url: 'https://img/x.png' }],
      _count: { comments: 3, attachmentsCount: 0, attachments: 2 } as unknown as {
        comments: number;
        attachments: number;
      },
    } as never);

    expect(card.labels[0]).toMatchObject({ id: 'lab1', name: 'Urgent', color: 'red' });
    expect(card.members[0]).toMatchObject({ id: 'u2', username: 'camille' });
    expect(card.checklistSummary).toEqual({ done: 1, total: 2 });
    expect(card.commentCount).toBe(3);
    expect(card.attachmentCount).toBe(2);
    expect(card.coverUrl).toBe('https://img/x.png');
    expect(card.dueComplete).toBe(false);
  });
});
