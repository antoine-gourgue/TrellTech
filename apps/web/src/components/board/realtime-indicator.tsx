import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { RealtimeStatus } from '@/lib/hooks/use-realtime';

const CONFIG: Record<RealtimeStatus, { label: string; dot: string; text: string }> = {
  online: { label: 'Temps réel actif', dot: 'bg-success', text: 'text-success' },
  connecting: { label: 'Connexion…', dot: 'bg-yellow-500', text: 'text-text-muted' },
  offline: { label: 'Hors ligne', dot: 'bg-danger', text: 'text-danger' },
};

export function RealtimeIndicator({ status }: { status: RealtimeStatus }) {
  const config = CONFIG[status];
  const Icon = status === 'offline' ? WifiOff : Wifi;
  return (
    <span
      title={config.label}
      className={cn('inline-flex items-center gap-1.5 text-sm', config.text)}
    >
      <span className="relative inline-flex">
        <span className={cn('size-2 rounded-full', config.dot)} aria-hidden />
        {status === 'online' ? (
          <span
            className="absolute inset-0 size-2 animate-ping rounded-full bg-success/60"
            aria-hidden
          />
        ) : null}
      </span>
      <Icon className="size-3.5" aria-hidden />
      <span className="sr-only">{config.label}</span>
    </span>
  );
}
