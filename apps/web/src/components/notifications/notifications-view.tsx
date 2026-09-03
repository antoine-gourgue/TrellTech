'use client';

import { AlertCircle, CheckCheck, Inbox } from 'lucide-react';
import type { Notification } from '@trelltech/shared';
import { cn } from '@/lib/cn';
import { fullDate, relativeTime } from '@/lib/dates';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationHistory,
} from '@/lib/hooks/use-notifications';
import { useAppNavigate } from '@/lib/hooks/use-app-navigate';
import { notificationIcon } from '@/components/notifications/notification-icon';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export function NotificationsView() {
  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNotificationHistory();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const { goToBoard } = useAppNavigate();

  const notifications = data?.pages.flat() ?? [];
  const unread = notifications.filter((item) => !item.read).length;

  function open(notification: Notification) {
    if (!notification.read) markRead.mutate(notification.id);
    if (notification.boardId) {
      goToBoard(notification.boardId, notification.cardId ?? undefined);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text">Notifications</h1>
          <p className="mt-0.5 text-sm text-text-muted">
            {unread > 0
              ? `${unread} non lue${unread > 1 ? 's' : ''}`
              : 'Tout est à jour'}
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => markAll.mutate()}
          disabled={unread === 0 || markAll.isPending}
          loading={markAll.isPending}
        >
          <CheckCheck className="size-4" aria-hidden />
          Tout marquer comme lu
        </Button>
      </header>

      {isLoading ? (
        <ul className="flex flex-col gap-2" aria-hidden>
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="flex items-start gap-3 rounded-lg border border-border bg-surface p-4">
              <Skeleton className="size-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-20" />
              </div>
            </li>
          ))}
        </ul>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-surface p-10 text-center">
          <AlertCircle className="size-8 text-danger" aria-hidden />
          <p className="text-base font-medium text-text">Chargement impossible</p>
          <p className="max-w-sm text-sm text-text-muted">
            Vos notifications n&apos;ont pas pu être récupérées.
          </p>
          <Button variant="secondary" size="sm" onClick={() => refetch()} loading={isRefetching}>
            Réessayer
          </Button>
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-surface p-12 text-center">
          <Inbox className="size-8 text-text-muted" aria-hidden />
          <p className="text-base font-medium text-text">Aucune notification</p>
          <p className="max-w-sm text-sm text-text-muted">
            Les mentions, assignations et échéances apparaîtront ici.
          </p>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {notifications.map((notification) => (
              <NotificationRow key={notification.id} notification={notification} onOpen={open} />
            ))}
          </ul>

          {hasNextPage ? (
            <div className="flex justify-center">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fetchNextPage()}
                loading={isFetchingNextPage}
              >
                Charger plus
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function NotificationRow({
  notification,
  onOpen,
}: {
  notification: Notification;
  onOpen: (notification: Notification) => void;
}) {
  const Icon = notificationIcon(notification.type);
  const actionable = Boolean(notification.boardId);

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(notification)}
        aria-disabled={!actionable && notification.read}
        className={cn(
          'flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors focus-visible:outline-2',
          notification.read
            ? 'border-border bg-surface hover:bg-surface-muted'
            : 'border-brand/30 bg-brand/[0.04] hover:bg-brand/[0.07]',
        )}
      >
        <span
          className={cn(
            'grid size-9 shrink-0 place-items-center rounded-full',
            notification.read ? 'bg-surface-muted text-text-muted' : 'bg-brand/15 text-brand',
          )}
        >
          <Icon className="size-4.5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-base font-medium text-text">
              {notification.title}
            </span>
            {!notification.read ? (
              <span
                className="size-2 shrink-0 rounded-full bg-brand"
                aria-label="Non lue"
              />
            ) : null}
          </span>
          <span className="mt-0.5 block text-sm text-text-muted">{notification.message}</span>
          <time
            dateTime={notification.createdAt}
            title={fullDate(notification.createdAt)}
            className="mt-1 block text-2xs text-text-muted"
          >
            {relativeTime(notification.createdAt)}
          </time>
        </span>
      </button>
    </li>
  );
}
