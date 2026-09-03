import { forwardRef, useId } from 'react';
import { cn } from '@/lib/cn';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hint?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, error, hint, id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedById = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium text-text">
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedById}
        className={cn(
          'h-10 w-full rounded-md border border-border bg-surface px-3 text-base text-text placeholder:text-text-muted transition-colors',
          'focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30',
          error && 'border-danger focus-visible:border-danger focus-visible:ring-danger/30',
          className,
        )}
        {...props}
      />
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
});
