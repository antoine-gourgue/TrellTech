import type { Label } from '@trelltech/shared';
import { cn } from '@/lib/cn';
import { getLabelColor } from '@/lib/label-colors';

type LabelDotsProps = {
  labels: Label[];
  className?: string;
  variant?: 'dot' | 'pill';
};

export function LabelDots({ labels, className, variant = 'dot' }: LabelDotsProps) {
  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {labels.map((label) => {
        const color = getLabelColor(label.color);
        if (variant === 'pill') {
          return (
            <span
              key={label.id}
              className="inline-flex h-5 items-center rounded-sm px-1.5 text-2xs font-semibold"
              style={{ backgroundColor: color.solid, color: color.contrast }}
            >
              {label.name || ' '}
            </span>
          );
        }
        return (
          <span
            key={label.id}
            title={label.name}
            className="h-1.5 w-6 rounded-full"
            style={{ backgroundColor: color.solid }}
          />
        );
      })}
    </div>
  );
}
