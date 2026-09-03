import { forwardRef, useId } from 'react';
import { cn } from '@/lib/cn';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, label, error, id, ...props },
  ref,
) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={textareaId} className="text-sm font-medium text-text">
          {label}
        </label>
      ) : null}
      <textarea
        ref={ref}
        id={textareaId}
        aria-invalid={error ? true : undefined}
        className={cn(
          'min-h-20 w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-base text-text placeholder:text-text-muted transition-colors',
          'focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30',
          error && 'border-danger focus-visible:border-danger focus-visible:ring-danger/30',
          className,
        )}
        {...props}
      />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
});
