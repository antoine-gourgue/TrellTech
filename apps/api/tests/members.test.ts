import { describe, expect, it } from 'vitest';
import { buildMembers, serializeWorkspaceWithContent } from '../src/lib/serialize.js';

const now = new Date('2026-01-01T00:00:00.000Z');
const user = (id: string) => ({ id, username: id, fullName: null, avatarUrl: null });

describe('buildMembers', () => {
  it('place le propriétaire en tête et dédoublonne', () => {
    const members = buildMembers(user('owner'), [
      { role: 'EDITOR', user: user('camille') },
      { role: 'VIEWER', user: user('owner') },
    ]);
    expect(members[0]).toMatchObject({ user: { id: 'owner' }, role: 'OWNER' });
    expect(members).toHaveLength(2);
    expect(members[1]).toMatchObject({ user: { id: 'camille' }, role: 'EDITOR' });
  });
});

describe('serializeWorkspaceWithContent', () => {
  it('expose le rôle effectif de l’utilisateur', () => {
    const output = serializeWorkspaceWithContent(
      {
        id: 'w1',
        trelloId: null,
        name: 'demo',
        displayName: 'Démo',
        description: null,
        ownerId: 'owner',
        createdAt: now,
        updatedAt: now,
        syncedAt: null,
        boards: [],
        docs: [],
        whiteboards: [],
      } as never,
      'EDITOR',
    );
    expect(output.role).toBe('EDITOR');
    expect(output).toMatchObject({ id: 'w1', boards: [], docs: [], whiteboards: [] });
  });
});
