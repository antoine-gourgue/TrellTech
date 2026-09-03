import { forwardRef } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

const base =
  'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-150 focus-visible:outline-2 disabled:pointer-events-none disabled:opacity-55 active:scale-[0.98] select-none whitespace-nowrap';

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-brand-contrast hover:bg-brand-hover shadow-sm',
  secondary:
    'bg-surface text-text border border-border hover:bg-surface-muted shadow-sm',
  ghost: 'text-text-muted hover:bg-surface-muted hover:text-text',
  danger: 'bg-danger text-white hover:brightness-95 shadow-sm',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading = false, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
});
