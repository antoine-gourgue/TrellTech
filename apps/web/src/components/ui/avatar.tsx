import type { PublicUser } from '@trelltech/shared';
import { cn } from '@/lib/cn';

const sizeClasses = {
  xs: 'size-6 text-2xs',
  sm: 'size-7 text-xs',
  md: 'size-9 text-sm',
} as const;

function initials(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function Avatar({
  user,
  size = 'sm',
  className,
}: {
  user: PublicUser;
  size?: keyof typeof sizeClasses;
  className?: string;
}) {
  const name = user.fullName ?? user.username;
  return (
    <span
      title={name}
      className={cn(
        'grid shrink-0 place-items-center overflow-hidden rounded-full bg-brand/15 font-semibold text-brand ring-2 ring-surface',
        sizeClasses[size],
        className,
      )}
    >
      {user.avatarUrl ? (
        <img
          src={`${user.avatarUrl}/50.png`}
          alt=""
          className="size-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}
