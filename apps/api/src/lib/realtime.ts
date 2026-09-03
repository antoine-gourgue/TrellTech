import type { RealtimeEvent } from '@trelltech/shared';

/**
 * Hub temps réel en mémoire : associe chaque board à ses sockets abonnés.
 * `emit` diffuse un événement à tous les abonnés du board concerné.
 */
export interface RealtimeClient {
  send(data: string): void;
}

const boardSubscribers = new Map<string, Set<RealtimeClient>>();

export function subscribe(boardId: string, client: RealtimeClient): void {
  let set = boardSubscribers.get(boardId);
  if (!set) {
    set = new Set();
    boardSubscribers.set(boardId, set);
  }
  set.add(client);
}

export function unsubscribe(boardId: string, client: RealtimeClient): void {
  const set = boardSubscribers.get(boardId);
  if (!set) return;
  set.delete(client);
  if (set.size === 0) boardSubscribers.delete(boardId);
}

export function unsubscribeEverywhere(client: RealtimeClient): void {
  for (const [boardId, set] of boardSubscribers) {
    set.delete(client);
    if (set.size === 0) boardSubscribers.delete(boardId);
  }
}

export function emit(event: RealtimeEvent): void {
  const set = boardSubscribers.get(event.boardId);
  if (!set || set.size === 0) return;
  const data = JSON.stringify(event);
  for (const client of set) {
    try {
      client.send(data);
    } catch {
      set.delete(client);
    }
  }
  if (set.size === 0) boardSubscribers.delete(event.boardId);
}

export function emitBoardEvent(params: {
  boardId: string;
  entity: RealtimeEvent['entity'];
  action: RealtimeEvent['action'];
  id: string;
  actorId: string | null;
  payload?: unknown;
}): void {
  emit({
    boardId: params.boardId,
    entity: params.entity,
    action: params.action,
    id: params.id,
    actorId: params.actorId,
    payload: params.payload,
  });
}
