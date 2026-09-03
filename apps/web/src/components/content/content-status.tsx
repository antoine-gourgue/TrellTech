'use client';

import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';

export function ContentStatus({
  loading,
  error,
  message,
  onRetry,
}: {
  loading: boolean;
  error: boolean;
  message?: string;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <div className="grid min-h-[60dvh] place-items-center">
        <div className="flex flex-col items-center gap-3 text-text-muted">
          <Spinner className="size-6 text-brand" />
          <p className="text-sm">Chargement…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid min-h-[60dvh] place-items-center p-6">
        <div className="max-w-sm text-center">
          <p className="text-md font-semibold text-text">Contenu introuvable</p>
          <p className="mt-2 text-base text-text-muted">
            {message ?? "Ce contenu n'existe pas ou n'est plus accessible."}
          </p>
          <Button variant="secondary" className="mt-4" onClick={onRetry}>
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
