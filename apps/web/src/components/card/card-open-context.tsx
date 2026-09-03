'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type CardOpenValue = {
  openCardId: string | null;
  openCard: (id: string) => void;
  closeCard: () => void;
};

const CardOpenContext = createContext<CardOpenValue | null>(null);

/** Synchronise la carte ouverte avec le paramètre d'URL `?card=<id>` (liable, rechargeable). */
export function CardOpenProvider({ children }: { children: React.ReactNode }) {
  const [openCardId, setOpenCardId] = useState<string | null>(null);

  useEffect(() => {
    const read = () => {
      const params = new URLSearchParams(window.location.search);
      setOpenCardId(params.get('card'));
    };
    read();
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, []);

  const openCard = useCallback((id: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('card', id);
    window.history.pushState(null, '', url);
    setOpenCardId(id);
  }, []);

  const closeCard = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete('card');
    window.history.pushState(null, '', url);
    setOpenCardId(null);
  }, []);

  const value = useMemo(
    () => ({ openCardId, openCard, closeCard }),
    [openCardId, openCard, closeCard],
  );

  return <CardOpenContext.Provider value={value}>{children}</CardOpenContext.Provider>;
}

export function useCardOpen(): CardOpenValue {
  const context = useContext(CardOpenContext);
  if (!context) {
    throw new Error('useCardOpen doit être utilisé dans un CardOpenProvider');
  }
  return context;
}
