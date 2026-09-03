'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { CommandPalette } from '@/components/command/command-palette';

type CommandPaletteValue = {
  open: () => void;
  close: () => void;
};

const CommandPaletteContext = createContext<CommandPaletteValue | null>(null);

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsOpen((current) => !current);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const value = useMemo(() => ({ open, close }), [open, close]);

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      <CommandPalette open={isOpen} onClose={close} />
    </CommandPaletteContext.Provider>
  );
}

export function useCommandPalette(): CommandPaletteValue {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error('useCommandPalette doit être utilisé dans un CommandPaletteProvider');
  }
  return context;
}
