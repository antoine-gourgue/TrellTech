import { cn } from '@/lib/cn';

type LogoProps = {
  className?: string;
  showText?: boolean;
};

/** Logo TrellTech : symbole « plateau » (trois colonnes en escalier dans un
 * carré arrondi indigo) + mot-symbole en Plus Jakarta Sans, « Tech » en indigo. */
export function Logo({ className, showText = true }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg aria-hidden viewBox="0 0 48 48" className="size-8 shrink-0">
        <defs>
          <linearGradient id="tt-logo-grad" x1="6" y1="4" x2="42" y2="46" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#6d6df0" />
            <stop offset="1" stopColor="#4f46d6" />
          </linearGradient>
        </defs>
        <rect x="1.5" y="1.5" width="45" height="45" rx="13" fill="url(#tt-logo-grad)" />
        <rect x="12" y="12" width="6.5" height="24" rx="3.25" fill="#ffffff" />
        <rect x="20.75" y="12" width="6.5" height="16" rx="3.25" fill="#ffffff" fillOpacity="0.9" />
        <rect x="29.5" y="12" width="6.5" height="11" rx="3.25" fill="#ffffff" fillOpacity="0.72" />
      </svg>
      {showText ? (
        <span className="font-brand text-lg font-bold tracking-[-0.03em] text-text">
          Trell<span className="text-brand">Tech</span>
        </span>
      ) : null}
    </span>
  );
}
