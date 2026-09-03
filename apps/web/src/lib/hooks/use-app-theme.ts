'use client';

import { useEffect, useState } from 'react';

/**
 * Observe la classe `.dark` sur `<html>` (posée par ThemeScript / ThemeToggle)
 * et renvoie le thème courant, pour synchroniser les éditeurs tiers.
 */
export function useAppTheme(): 'light' | 'dark' {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const root = document.documentElement;
    const read = () => setTheme(root.classList.contains('dark') ? 'dark' : 'light');
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return theme;
}
