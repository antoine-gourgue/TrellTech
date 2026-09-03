'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreateBoardInput } from '@trelltech/shared';
import { ApiRequestError } from '@/lib/api';
import { useCreateBoard } from '@/lib/hooks/use-workspaces';
import { useToast } from '@/components/ui/toast';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type BoardFormModalProps = {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  workspaceName: string;
};

export function BoardFormModal({
  open,
  onClose,
  workspaceId,
  workspaceName,
}: BoardFormModalProps) {
  const router = useRouter();
  const toast = useToast();
  const create = useCreateBoard();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName('');
      setError(null);
    }
  }, [open]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = CreateBoardInput.safeParse({ workspaceId, name });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Formulaire invalide');
      return;
    }
    try {
      const board = await create.mutateAsync(parsed.data);
      toast.success('Tableau créé');
      onClose();
      router.push(`/boards/${board.id}`);
    } catch (err) {
      toast.error('Création impossible', err instanceof ApiRequestError ? err.message : undefined);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nouveau tableau"
      description={`Dans l'espace « ${workspaceName} »`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={create.isPending} type="button">
            Annuler
          </Button>
          <Button type="submit" form="board-form" loading={create.isPending}>
            Créer le tableau
          </Button>
        </>
      }
    >
      <form id="board-form" onSubmit={submit}>
        <Input
          label="Nom du tableau"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Sprint 12, Roadmap, Idées…"
          error={error ?? undefined}
          autoComplete="off"
          maxLength={200}
        />
      </form>
    </Modal>
  );
}
