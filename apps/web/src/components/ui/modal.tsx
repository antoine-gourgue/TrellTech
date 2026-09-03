'use client';

import { useCallback, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { IconButton } from './icon-button';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  size?: ModalSize;
  renderHeader?: React.ReactNode;
};

const sizes: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-3xl',
};

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  bodyClassName,
  size = 'md',
  renderHeader,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      );
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => {
      const panel = panelRef.current;
      const target = panel?.querySelector<HTMLElement>(FOCUSABLE);
      (target ?? panel)?.focus();
    }, 0);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = overflow;
      previouslyFocused.current?.focus();
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-4 sm:items-center"
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        aria-label="Fermer"
        tabIndex={-1}
        onClick={onClose}
        className="animate-fade-in fixed inset-0 cursor-default bg-black/40 backdrop-blur-sm"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={renderHeader ? undefined : titleId}
        aria-label={renderHeader ? title : undefined}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          'animate-scale-in relative z-10 flex max-h-[calc(100dvh-2rem)] w-full flex-col rounded-lg border border-border bg-surface shadow-md outline-none',
          sizes[size],
          className,
        )}
      >
        {renderHeader ? (
          <div className="flex items-start justify-between gap-3 px-5 pt-5">
            <div className="min-w-0 flex-1">{renderHeader}</div>
            <IconButton label="Fermer" onClick={onClose} size="sm">
              <X className="size-4" aria-hidden />
            </IconButton>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4 px-5 pt-5">
            <div className="min-w-0">
              <h2 id={titleId} className="text-lg font-semibold text-text">
                {title}
              </h2>
              {description ? (
                <p id={descriptionId} className="mt-1 text-sm text-text-muted">
                  {description}
                </p>
              ) : null}
            </div>
            <IconButton label="Fermer" onClick={onClose} size="sm">
              <X className="size-4" aria-hidden />
            </IconButton>
          </div>
        )}
        <div className={cn('scrollbar-thin overflow-y-auto px-5 py-4', bodyClassName)}>
          {children}
        </div>
        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
