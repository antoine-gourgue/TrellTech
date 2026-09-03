'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Navigation applicative qui synchronise le paramètre `?card=` avec la modale
 * de carte : émet un `popstate` pour que le CardOpenProvider relise l'URL.
 */
export function useAppNavigate() {
  const router = useRouter();

  const notifyCardParam = useCallback(() => {
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);

  const goToBoard = useCallback(
    (boardId: string, cardId?: string) => {
      const query = cardId ? `?card=${encodeURIComponent(cardId)}` : '';
      router.push(`/boards/${boardId}${query}`);
      requestAnimationFrame(notifyCardParam);
    },
    [router, notifyCardParam],
  );

  const goToDoc = useCallback(
    (docId: string) => {
      router.push(`/docs/${docId}`);
    },
    [router],
  );

  return { goToBoard, goToDoc };
}
