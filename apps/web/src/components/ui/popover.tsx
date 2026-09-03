'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';

type PopoverProps = {
  trigger: (props: {
    open: boolean;
    toggle: () => void;
    ref: React.Ref<HTMLButtonElement>;
    'aria-expanded': boolean;
    'aria-haspopup': 'dialog';
  }) => React.ReactNode;
  children: (props: { close: () => void }) => React.ReactNode;
  title?: string;
  align?: 'start' | 'end' | 'center';
  className?: string;
};

const GAP = 6;
const MARGIN = 8;

/**
 * Popover rendu dans un PORTAIL avec positionnement `fixed` calculé depuis le
 * rectangle du déclencheur, puis borné à la fenêtre (jamais coupé hors écran,
 * même quand le déclencheur est au bord — ex. cloche dans la sidebar étroite).
 */
export function Popover({ trigger, children, title, align = 'start', className }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => setMounted(true), []);

  const reposition = useCallback(() => {
    const trig = triggerRef.current;
    const panel = panelRef.current;
    if (!trig || !panel) return;
    const t = trig.getBoundingClientRect();
    const pw = panel.offsetWidth;
    const ph = panel.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left =
      align === 'end' ? t.right - pw : align === 'center' ? t.left + t.width / 2 - pw / 2 : t.left;
    // Bornage horizontal
    left = Math.min(Math.max(left, MARGIN), Math.max(MARGIN, vw - pw - MARGIN));

    // Sous le déclencheur, sinon au-dessus si ça déborde en bas
    let top = t.bottom + GAP;
    if (top + ph > vh - MARGIN && t.top - GAP - ph > MARGIN) {
      top = t.top - GAP - ph;
    }
    top = Math.min(Math.max(top, MARGIN), Math.max(MARGIN, vh - ph - MARGIN));

    setPos({ top, left });
  }, [align]);

  useLayoutEffect(() => {
    if (!open) return;
    reposition();
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(
      'input, button, textarea, [tabindex]:not([tabindex="-1"])',
    );
    first?.focus();
    function onScrollResize() {
      reposition();
    }
    window.addEventListener('resize', onScrollResize);
    window.addEventListener('scroll', onScrollResize, true);
    return () => {
      window.removeEventListener('resize', onScrollResize);
      window.removeEventListener('scroll', onScrollResize, true);
    };
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  function onPanelKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  return (
    <>
      {trigger({
        open,
        toggle: () => setOpen((v) => !v),
        ref: triggerRef,
        'aria-expanded': open,
        'aria-haspopup': 'dialog',
      })}
      {open && mounted
        ? createPortal(
            <div
              ref={panelRef}
              role="dialog"
              aria-modal="false"
              onKeyDown={onPanelKeyDown}
              aria-labelledby={title ? titleId : undefined}
              style={{
                position: 'fixed',
                top: pos?.top ?? -9999,
                left: pos?.left ?? -9999,
                visibility: pos ? 'visible' : 'hidden',
              }}
              className={cn(
                'animate-scale-in z-[60] w-72 rounded-lg border border-border bg-surface p-3 shadow-md',
                className,
              )}
            >
              {title ? (
                <p id={titleId} className="mb-2 text-center text-sm font-semibold text-text">
                  {title}
                </p>
              ) : null}
              {children({ close: () => setOpen(false) })}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
