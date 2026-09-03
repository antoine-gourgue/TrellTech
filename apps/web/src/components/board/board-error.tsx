import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

type BoardErrorProps = {
  message?: string;
  onRetry: () => void;
  onBack: () => void;
};

export function BoardError({ message, onRetry, onBack }: BoardErrorProps) {
  return (
    <div className="grid h-[calc(100dvh-3.5rem)] place-items-center p-6 lg:h-dvh">
      <div className="max-w-sm text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-lg bg-danger/10 text-danger">
          <AlertTriangle className="size-7" aria-hidden />
        </span>
        <h2 className="mt-5 text-lg font-semibold text-text">Tableau introuvable</h2>
        <p className="mt-2 text-base text-text-muted">
          {message ?? "Ce tableau n'existe pas ou n'est plus accessible."}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="secondary" onClick={onBack}>
            Retour à l&apos;accueil
          </Button>
          <Button onClick={onRetry}>Réessayer</Button>
        </div>
      </div>
    </div>
  );
}
