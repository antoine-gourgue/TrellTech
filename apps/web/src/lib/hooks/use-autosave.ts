'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Autosave débounce : `schedule(value)` reporte la sauvegarde jusqu'à `delay` ms
 * d'inactivité et expose un `status` pour l'indicateur « Enregistré / Enregistrement… ».
 */
export function useAutosave<T>(save: (value: T) => Promise<unknown>, delay = 800) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ value: T } | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;

  const flush = useCallback(async () => {
    if (!pending.current) return;
    const { value } = pending.current;
    pending.current = null;
    try {
      await saveRef.current(value);
      setStatus((s) => (s === 'saving' ? 'saved' : s));
    } catch {
      setStatus('error');
    }
  }, []);

  const schedule = useCallback(
    (value: T) => {
      pending.current = { value };
      setStatus('saving');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, delay);
    },
    [delay, flush],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { status, schedule };
}
