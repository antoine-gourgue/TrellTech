import { describe, expect, it, vi } from 'vitest';
import {
  emitBoardEvent,
  subscribe,
  unsubscribe,
  unsubscribeEverywhere,
} from '../src/lib/realtime.js';

describe('hub temps réel', () => {
  it('diffuse un événement aux abonnés du board concerné uniquement', () => {
    const a = { send: vi.fn() };
    const b = { send: vi.fn() };
    subscribe('board-1', a);
    subscribe('board-2', b);

    emitBoardEvent({
      boardId: 'board-1',
      entity: 'card',
      action: 'created',
      id: 'card-9',
      actorId: 'user-1',
    });

    expect(a.send).toHaveBeenCalledTimes(1);
    expect(b.send).not.toHaveBeenCalled();
    const payload = JSON.parse((a.send.mock.calls[0]?.[0] as string) ?? '{}');
    expect(payload).toMatchObject({ boardId: 'board-1', entity: 'card', actorId: 'user-1' });

    unsubscribe('board-1', a);
    unsubscribeEverywhere(b);
  });

  it('ne notifie plus après désabonnement', () => {
    const c = { send: vi.fn() };
    subscribe('board-3', c);
    unsubscribe('board-3', c);
    emitBoardEvent({
      boardId: 'board-3',
      entity: 'list',
      action: 'updated',
      id: 'list-1',
      actorId: null,
    });
    expect(c.send).not.toHaveBeenCalled();
  });
});
