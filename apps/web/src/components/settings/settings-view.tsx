'use client';

import { useState } from 'react';
import {
  AlertCircle,
  AtSign,
  CalendarDays,
  Check,
  DownloadCloud,
  Link2,
  LogOut,
  Mail,
  Moon,
  ShieldCheck,
  Sun,
  Unlink,
} from 'lucide-react';
import type { User } from '@trelltech/shared';
import { cn } from '@/lib/cn';
import { fullDate } from '@/lib/dates';
import { API_URL, ApiRequestError } from '@/lib/api';
import { applyTheme, type Theme } from '@/lib/theme';
import { useLogout, useMe, useUnlinkTrello } from '@/lib/hooks/use-auth';
import { useAppTheme } from '@/lib/hooks/use-app-theme';
import { useSyncTrello } from '@/lib/hooks/use-workspaces';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';

export function SettingsView() {
  const { data: me, isLoading, isError, refetch, isRefetching } = useMe();

  if (isLoading) {
    return (
      <Shell>
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </Shell>
    );
  }

  if (isError || !me) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-10 text-center">
          <AlertCircle className="size-8 text-danger" aria-hidden />
          <p className="text-base font-medium text-text">Profil indisponible</p>
          <p className="max-w-sm text-sm text-text-muted">
            Vos informations de compte n&apos;ont pas pu être chargées.
          </p>
          <Button variant="secondary" size="sm" onClick={() => refetch()} loading={isRefetching}>
            Réessayer
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <AccountSection me={me} />
      <TrelloIntegrationSection me={me} />
      <PreferencesSection />
      <DangerSection />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-xl font-semibold text-text">Paramètres</h1>
        <p className="mt-0.5 text-sm text-text-muted">Votre compte et vos préférences.</p>
      </header>
      {children}
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-text">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-text-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function AccountSection({ me }: { me: User }) {
  const rows = [
    { icon: AtSign, label: "Nom d'utilisateur", value: `@${me.username}` },
    { icon: Mail, label: 'Email', value: me.email ?? 'Non renseigné' },
    { icon: CalendarDays, label: 'Membre depuis', value: fullDate(me.createdAt) },
  ];

  return (
    <Section title="Compte">
      <div className="flex items-center gap-4">
        <Avatar user={me} className="size-16 text-xl" />
        <div className="min-w-0">
          <p className="truncate text-md font-semibold text-text">
            {me.fullName ?? me.username}
          </p>
          <p className="truncate text-sm text-text-muted">@{me.username}</p>
          {me.trelloLinked ? (
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
              <ShieldCheck className="size-3.5" aria-hidden />
              Compte Trello lié
            </span>
          ) : null}
        </div>
      </div>

      <dl className="mt-5 divide-y divide-border border-t border-border">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <div key={row.label} className="flex items-center gap-3 py-3">
              <Icon className="size-4 shrink-0 text-text-muted" aria-hidden />
              <dt className="w-40 shrink-0 text-sm text-text-muted">{row.label}</dt>
              <dd className="min-w-0 flex-1 truncate text-sm font-medium text-text">
                {row.value}
              </dd>
            </div>
          );
        })}
      </dl>
    </Section>
  );
}

function TrelloIntegrationSection({ me }: { me: User }) {
  const toast = useToast();
  const sync = useSyncTrello();
  const unlink = useUnlinkTrello();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function link() {
    window.location.href = `${API_URL}/api/auth/trello/link`;
  }

  async function runSync() {
    try {
      await sync.mutateAsync();
      toast.success('Import terminé', 'Vos données Trello ont été synchronisées.');
    } catch (err) {
      toast.error('Import impossible', err instanceof ApiRequestError ? err.message : undefined);
    }
  }

  async function confirmUnlink() {
    try {
      await unlink.mutateAsync();
      setConfirmOpen(false);
      toast.success('Compte Trello délié', 'Vous pourrez le relier à tout moment.');
    } catch (err) {
      toast.error('Action impossible', err instanceof ApiRequestError ? err.message : undefined);
    }
  }

  return (
    <Section
      title="Intégration Trello"
      description="Liez votre compte Trello pour importer et synchroniser vos tableaux."
    >
      {me.trelloLinked ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-success/10 text-success">
                <Check className="size-4" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-medium text-text">Compte Trello lié</p>
                <p className="text-sm text-text-muted">
                  Vos tableaux Trello peuvent être importés dans TrellTech.
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setConfirmOpen(true)}
              loading={unlink.isPending}
            >
              <Unlink className="size-4" aria-hidden />
              Délier
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <div>
              <p className="text-sm font-medium text-text">Importer depuis Trello</p>
              <p className="text-sm text-text-muted">Synchronise vos tableaux et cartes Trello.</p>
            </div>
            <Button variant="secondary" size="sm" onClick={runSync} loading={sync.isPending}>
              <DownloadCloud className="size-4" aria-hidden />
              Importer
            </Button>
          </div>

          <ConfirmDialog
            open={confirmOpen}
            title="Délier votre compte Trello ?"
            description="L'import et la synchronisation seront désactivés tant que le compte n'est pas relié."
            confirmLabel="Délier"
            destructive
            loading={unlink.isPending}
            onConfirm={confirmUnlink}
            onClose={() => setConfirmOpen(false)}
          />
        </>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-md bg-surface-muted text-text-muted">
              <Link2 className="size-4" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-medium text-text">Aucun compte Trello lié</p>
              <p className="text-sm text-text-muted">
                Liez Trello pour importer et synchroniser vos tableaux.
              </p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={link}>
            <Link2 className="size-4" aria-hidden />
            Lier mon compte Trello
          </Button>
        </div>
      )}
    </Section>
  );
}

function PreferencesSection() {
  return (
    <Section title="Préférences">
      <div className="flex flex-wrap items-center justify-between gap-3 py-1">
        <div>
          <p className="text-sm font-medium text-text">Thème</p>
          <p className="text-sm text-text-muted">Apparence claire ou sombre de l&apos;interface.</p>
        </div>
        <ThemeSelector />
      </div>
    </Section>
  );
}

function ThemeSelector() {
  const current = useAppTheme();
  const options: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Clair', icon: Sun },
    { value: 'dark', label: 'Sombre', icon: Moon },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Thème"
      className="inline-flex rounded-md border border-border bg-surface-muted p-0.5"
    >
      {options.map((option) => {
        const active = current === option.value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => applyTheme(option.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2',
              active ? 'bg-surface text-text shadow-sm' : 'text-text-muted hover:text-text',
            )}
          >
            <Icon className="size-4" aria-hidden />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function DangerSection() {
  const logout = useLogout();

  function handleLogout() {
    logout.mutate(undefined, {
      onSuccess: () => {
        window.location.href = '/login';
      },
    });
  }

  return (
    <Section title="Session">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-text">Se déconnecter</p>
          <p className="text-sm text-text-muted">Fermez votre session sur cet appareil.</p>
        </div>
        <Button variant="danger" size="sm" onClick={handleLogout} loading={logout.isPending}>
          <LogOut className="size-4" aria-hidden />
          Se déconnecter
        </Button>
      </div>
    </Section>
  );
}
