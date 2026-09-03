'use client';

import Link from 'next/link';
import { ArrowRight, Bell, CheckCheck } from 'lucide-react';
import type { Notification } from '@trelltech/shared';
import { cn } from '@/lib/cn';
import { relativeTime } from '@/lib/dates';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/lib/hooks/use-notifications';
import { useAppNavigate } from '@/lib/hooks/use-app-navigate';
import { notificationIcon } from '@/components/notifications/notification-icon';
import { Popover } from '@/components/ui/popover';
import { IconButton } from '@/components/ui/icon-button';
import { Spinner } from '@/components/ui/spinner';

export function NotificationBell() {
  const { data: notifications, isLoading, isError } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const { goToBoard } = useAppNavigate();

  const unread = notifications?.filter((item) => !item.read).length ?? 0;

  function handleOpen(notification: Notification, close: () => void) {
    if (!notification.read) markRead.mutate(notification.id);
    if (notification.boardId) {
      goToBoard(notification.boardId, notification.cardId ?? undefined);
    }
    close();
  }

  return (
    <Popover
      align="end"
      className="w-80 p-0"
      trigger={({ toggle, ref, open, ...aria }) => (
        <IconButton
          ref={ref}
          label="Notifications"
          size="md"
          onClick={toggle}
          aria-expanded={open}
          aria-haspopup={aria['aria-haspopup']}
        >
          <span className="relative">
            <Bell className="size-5" aria-hidden />
            {unread > 0 ? (
              <span
                className="absolute -right-1.5 -top-1.5 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-2xs font-bold text-white"
                aria-label={`${unread} non lues`}
              >
                {unread > 9 ? '9+' : unread}
              </span>
            ) : null}
          </span>
        </IconButton>
      )}
    >
      {({ close }) => (
        <div className="flex max-h-[70vh] flex-col">
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
            <p className="text-base font-semibold text-text">Notifications</p>
            {unread > 0 ? (
              <button
                type="button"
                onClick={() => markAll.mutate()}
                className="inline-flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-sm font-medium text-brand transition-colors hover:bg-brand/10"
              >
                <CheckCheck className="size-3.5" aria-hidden />
                Tout marquer lu
              </button>
            ) : null}
          </div>

          <div className="scrollbar-thin overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center gap-2 px-3 py-8 text-sm text-text-muted">
                <Spinner className="size-4 text-brand" />
                Chargement…
              </div>
            ) : isError ? (
              <p className="px-3 py-8 text-center text-sm text-text-muted">
                Impossible de charger les notifications.
              </p>
            ) : notifications && notifications.length > 0 ? (
              <ul className="flex flex-col divide-y divide-border">
                {notifications.map((notification) => {
                  const Icon = notificationIcon(notification.type);
                  return (
                    <li key={notification.id}>
                      <button
                        type="button"
                        onClick={() => handleOpen(notification, close)}
                        className={cn(
                          'flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-surface-muted',
                          notification.read ? 'opacity-70' : 'bg-brand/[0.04]',
                        )}
                      >
                        <span
                          className={cn(
                            'mt-0.5 shrink-0',
                            notification.read ? 'text-text-muted' : 'text-brand',
                          )}
                        >
                          <Icon className="size-4" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="min-w-0 flex-1 truncate text-base font-medium text-text">
                              {notification.title}
                            </span>
                            {!notification.read ? (
                              <span
                                className="size-2 shrink-0 rounded-full bg-brand"
                                aria-hidden
                              />
                            ) : null}
                          </span>
                          <span className="mt-0.5 block text-sm text-text-muted">
                            {notification.message}
                          </span>
                          <span className="mt-0.5 block text-2xs text-text-muted">
                            {relativeTime(notification.createdAt)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="flex flex-col items-center gap-2 px-3 py-10 text-center">
                <Bell className="size-6 text-text-muted" aria-hidden />
                <p className="text-sm text-text-muted">Aucune notification pour l&apos;instant.</p>
              </div>
            )}
          </div>

          <div className="border-t border-border p-1.5">
            <Link
              href="/notifications"
              onClick={close}
              className="flex items-center justify-center gap-1.5 rounded-sm px-3 py-2 text-sm font-medium text-brand transition-colors hover:bg-brand/10 focus-visible:outline-2"
            >
              Voir toutes les notifications
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      )}
    </Popover>
  );
}
