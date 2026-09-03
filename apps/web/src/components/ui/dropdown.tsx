'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

export type DropdownItem = {
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  danger?: boolean;
};

type DropdownProps = {
  trigger: (props: { open: boolean; toggle: () => void; ref: React.Ref<HTMLButtonElement> }) => React.ReactNode;
  items: DropdownItem[];
  align?: 'start' | 'end';
};

export function Dropdown({ trigger, items, align = 'end' }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    const first = menuRef.current?.querySelector<HTMLButtonElement>('button');
    first?.focus();
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-flex">
      {trigger({ open, toggle: () => setOpen((v) => !v), ref: triggerRef })}
      {open ? (
        <div
          ref={menuRef}
          role="menu"
          className={cn(
            'animate-scale-in absolute top-full z-40 mt-1 min-w-44 overflow-hidden rounded-md border border-border bg-surface p-1 shadow-md',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item, index) => (
            <button
              key={index}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-base transition-colors',
                item.danger
                  ? 'text-danger hover:bg-danger/10'
                  : 'text-text hover:bg-surface-muted',
              )}
            >
              {item.icon ? <span className="shrink-0 [&>svg]:size-4">{item.icon}</span> : null}
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
