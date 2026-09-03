'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

type ToastVariant = 'success' | 'error' | 'info';

type Toast = {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
};

type ToastInput = Omit<Toast, 'id' | 'variant'> & { variant?: ToastVariant };

type ToastContextValue = {
  toast: (input: ToastInput) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const icons: Record<ToastVariant, typeof Info> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const accents: Record<ToastVariant, string> = {
  success: 'text-success',
  error: 'text-danger',
  info: 'text-brand',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = crypto.randomUUID();
      const next: Toast = { id, variant: input.variant ?? 'info', ...input };
      setToasts((current) => [...current, next]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), 5000),
      );
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (title, description) => toast({ title, description, variant: 'success' }),
      error: (title, description) => toast({ title, description, variant: 'error' }),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions"
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2"
      >
        {toasts.map((t) => {
          const Icon = icons[t.variant];
          return (
            <div
              key={t.id}
              role="status"
              className="animate-slide-in pointer-events-auto flex items-start gap-3 rounded-md border border-border bg-surface p-3 shadow-md"
            >
              <Icon className={cn('mt-0.5 size-5 shrink-0', accents[t.variant])} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-text">{t.title}</p>
                {t.description ? (
                  <p className="mt-0.5 text-sm text-text-muted">{t.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="rounded-sm p-1 text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
                aria-label="Fermer la notification"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast doit être utilisé dans un ToastProvider');
  }
  return context;
}
