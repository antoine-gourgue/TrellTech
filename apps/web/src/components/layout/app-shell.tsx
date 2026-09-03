'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Menu } from 'lucide-react';
import { ApiRequestError } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { useMe } from '@/lib/hooks/use-auth';
import { Logo } from '@/components/logo';
import { Spinner } from '@/components/ui/spinner';
import { IconButton } from '@/components/ui/icon-button';
import { Sidebar } from '@/components/layout/sidebar';
import { CommandPaletteProvider } from '@/components/command/command-palette-context';
import { CommandTrigger } from '@/components/command/command-trigger';
import { NotificationBell } from '@/components/notifications/notification-bell';

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me, isLoading, isError, error } = useMe();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.me });
  }, [queryClient]);

  useEffect(() => {
    if (isError && error instanceof ApiRequestError && error.status === 401) {
      router.replace('/login');
    }
  }, [isError, error, router]);

  if (isLoading || (isError && error instanceof ApiRequestError && error.status === 401)) {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg">
        <div className="flex flex-col items-center gap-3 text-text-muted">
          <Spinner className="size-6 text-brand" />
          <p className="text-sm">Chargement de votre espace…</p>
        </div>
      </div>
    );
  }

  if (isError || !me) {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg p-6">
        <div className="max-w-sm text-center">
          <p className="text-md font-semibold text-text">Connexion au serveur impossible</p>
          <p className="mt-2 text-base text-text-muted">
            {error instanceof ApiRequestError
              ? error.message
              : "Le serveur ne répond pas. Vérifiez que l'API est démarrée puis réessayez."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <CommandPaletteProvider>
      <div className="flex min-h-dvh bg-bg">
        {mobileOpen ? (
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setMobileOpen(false)}
            className="animate-fade-in fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          />
        ) : null}

        <Sidebar user={me} mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 items-center gap-3 border-b border-border bg-surface px-4 lg:hidden">
            <IconButton label="Ouvrir le menu" onClick={() => setMobileOpen(true)}>
              <Menu className="size-5" aria-hidden />
            </IconButton>
            <Logo />
            <div className="ml-auto flex items-center gap-1">
              <CommandTrigger />
              <NotificationBell />
            </div>
          </header>
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </CommandPaletteProvider>
  );
}
