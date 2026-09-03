'use client';

import { forwardRef, useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/cn';

export type PasswordInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: string;
  error?: string;
  hint?: string;
};

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ className, label, error, hint, id, ...props }, ref) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const describedById = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
    const [visible, setVisible] = useState(false);

    return (
      <div className="flex flex-col gap-1.5">
        {label ? (
          <label htmlFor={inputId} className="text-sm font-medium text-text">
            {label}
          </label>
        ) : null}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={visible ? 'text' : 'password'}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedById}
            className={cn(
              'h-10 w-full rounded-md border border-border bg-surface pl-3 pr-10 text-base text-text placeholder:text-text-muted transition-colors',
              'focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30',
              error && 'border-danger focus-visible:border-danger focus-visible:ring-danger/30',
              className,
            )}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            aria-pressed={visible}
            className="absolute inset-y-0 right-0 grid w-10 place-items-center text-text-muted transition-colors hover:text-text focus-visible:outline-2"
          >
            {visible ? (
              <EyeOff className="size-4" aria-hidden />
            ) : (
              <Eye className="size-4" aria-hidden />
            )}
          </button>
        </div>
        {error ? (
          <p id={describedById} className="text-sm text-danger">
            {error}
          </p>
        ) : hint ? (
          <p id={describedById} className="text-sm text-text-muted">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);
