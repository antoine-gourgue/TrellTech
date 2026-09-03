'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RealtimeEventSchema, type RealtimeEvent } from '@trelltech/shared';
import { API_URL } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { useMe } from '@/lib/hooks/use-auth';

export type RealtimeStatus = 'connecting' | 'online' | 'offline';

function websocketUrl(): string {
  const base = API_URL.replace(/^http/, 'ws').replace(/\/$/, '');
  return `${base}/ws`;
}

function backoffDelay(attempt: number): number {
  const capped = Math.min(attempt, 5);
  const base = 1000 * 2 ** capped;
  return Math.min(base, 15000) + Math.random() * 500;
}

/**
 * Abonne le board au flux WebSocket et répercute les mutations des autres
 * utilisateurs (actorId ≠ soi) sur le cache react-query. Reconnexion en backoff.
 */
export function useRealtime(boardId: string): { status: RealtimeStatus } {
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const meIdRef = useRef<string | undefined>(undefined);
  meIdRef.current = me?.id;

  const [status, setStatus] = useState<RealtimeStatus>('connecting');

  useEffect(() => {
    if (!boardId) return;
    if (typeof window === 'undefined' || !('WebSocket' in window)) return;

    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let disposed = false;

    function applyEvent(event: RealtimeEvent) {
      if (event.actorId && event.actorId === meIdRef.current) return;

      queryClient.invalidateQueries({ queryKey: queryKeys.board(event.boardId) });

      switch (event.entity) {
        case 'card':
          queryClient.invalidateQueries({ queryKey: queryKeys.card(event.id) });
          break;
        case 'comment':
        case 'checklist':
          queryClient.invalidateQueries({ queryKey: ['card'] });
          break;
        case 'member':
          queryClient.invalidateQueries({ queryKey: queryKeys.boardMembers(event.boardId) });
          break;
        default:
          break;
      }
    }

    function connect() {
      if (disposed) return;
      setStatus((current) => (current === 'online' ? current : 'connecting'));

      let ws: WebSocket;
      try {
        ws = new WebSocket(websocketUrl());
      } catch {
        scheduleReconnect();
        return;
      }
      socket = ws;

      ws.addEventListener('open', () => {
        if (disposed) return;
        attempt = 0;
        setStatus('online');
        ws.send(JSON.stringify({ subscribe: boardId }));
      });

      ws.addEventListener('message', (message) => {
        let payload: unknown;
        try {
          payload = JSON.parse(typeof message.data === 'string' ? message.data : '');
        } catch {
          return;
        }
        const parsed = RealtimeEventSchema.safeParse(payload);
        if (parsed.success) applyEvent(parsed.data);
      });

      ws.addEventListener('close', () => {
        if (disposed) return;
        setStatus('offline');
        scheduleReconnect();
      });

      ws.addEventListener('error', () => {
        ws.close();
      });
    }

    function scheduleReconnect() {
      if (disposed || reconnectTimer) return;
      const delay = backoffDelay(attempt);
      attempt += 1;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, delay);
    }

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socket) {
        try {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ unsubscribe: boardId }));
          }
          socket.close();
        } catch {
          /* socket déjà fermé */
        }
      }
    };
  }, [boardId, queryClient]);

  return { status };
}
