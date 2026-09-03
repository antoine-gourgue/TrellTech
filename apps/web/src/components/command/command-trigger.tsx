'use client';

import { Search } from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';
import { useCommandPalette } from '@/components/command/command-palette-context';

export function CommandTrigger() {
  const { open } = useCommandPalette();
  return (
    <IconButton label="Rechercher (Cmd/Ctrl + K)" size="md" onClick={open}>
      <Search className="size-5" aria-hidden />
    </IconButton>
  );
}
