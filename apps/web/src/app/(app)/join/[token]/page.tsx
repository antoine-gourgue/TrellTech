'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, TriangleAlert } from 'lucide-react';
import { ApiRequestError } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { useJoinShare, type JoinResult } from '@/lib/hooks/use-board-share';
import { Button } from '@/components/ui/button';

function destinationFor(result: JoinResult): string {
  switch (result.type) {
    case 'board':
      return `/boards/${result.id}`;
    case 'doc':
      return `/docs/${result.id}`;
    case 'whiteboard':
      return `/whiteboards/${result.id}`;
    case 'workspace':
      return '/';
  }
}

export default function JoinPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const router = useRouter();
  const queryClient = useQueryClient();
  const join = useJoinShare();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !token) return;
    started.current = true;
    join
      .mutateAsync(token)
      .then((result) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.workspaces });
        queryClient.invalidateQueries({ queryKey: queryKeys.shared });
        router.replace(destinationFor(result));
      })
      .catch((err) =>
        setError(
          err instanceof ApiRequestError
            ? err.message
            : 'Ce lien de partage est invalide ou expiré.',
        ),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      {error ? (
        <div className="flex max-w-sm flex-col items-center gap-3 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-danger/10 text-danger">
            <TriangleAlert className="size-6" aria-hidden />
          </span>
          <h1 className="text-lg font-semibold text-text">Lien inutilisable</h1>
          <p className="text-sm text-text-muted">{error}</p>
          <Button variant="secondary" onClick={() => router.replace('/')}>
            Retour à l&apos;accueil
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="size-6 animate-spin text-brand" aria-hidden />
          <p className="text-sm text-text-muted">Accès au contenu partagé…</p>
        </div>
      )}
    </div>
  );
}
