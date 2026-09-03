import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'ghost' | 'solid' | 'danger';
type Size = 'sm' | 'md';

export type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  variant?: Variant;
  size?: Size;
};

const variants: Record<Variant, string> = {
  ghost: 'text-text-muted hover:bg-surface-muted hover:text-text',
  solid: 'bg-surface border border-border text-text hover:bg-surface-muted shadow-sm',
  danger: 'text-text-muted hover:bg-danger/10 hover:text-danger',
};

const sizes: Record<Size, string> = {
  sm: 'size-7',
  md: 'size-9',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, label, variant = 'ghost', size = 'md', children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md transition-all duration-150 focus-visible:outline-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
