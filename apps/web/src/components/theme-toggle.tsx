'use client';

import { Moon, Sun } from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';
import { useAppTheme } from '@/lib/hooks/use-app-theme';
import { applyTheme } from '@/lib/theme';

export function ThemeToggle() {
  const dark = useAppTheme() === 'dark';

  return (
    <IconButton
      label={dark ? 'Passer en thème clair' : 'Passer en thème sombre'}
      onClick={() => applyTheme(dark ? 'light' : 'dark')}
      variant="ghost"
    >
      {dark ? <Sun className="size-4.5" aria-hidden /> : <Moon className="size-4.5" aria-hidden />}
    </IconButton>
  );
}
