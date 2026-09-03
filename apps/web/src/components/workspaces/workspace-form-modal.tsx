'use client';

import { useEffect, useState } from 'react';
import { CreateWorkspaceInput } from '@trelltech/shared';
import { ApiRequestError } from '@/lib/api';
import { useCreateWorkspace, useUpdateWorkspace } from '@/lib/hooks/use-workspaces';
import { useToast } from '@/components/ui/toast';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type WorkspaceFormModalProps = {
  open: boolean;
  onClose: () => void;
  mode?: 'create' | 'edit';
  workspaceId?: string;
  initialName?: string;
  initialDescription?: string | null;
};

export function WorkspaceFormModal({
  open,
  onClose,
  mode = 'create',
  workspaceId,
  initialName = '',
  initialDescription = '',
}: WorkspaceFormModalProps) {
  const toast = useToast();
  const create = useCreateWorkspace();
  const update = useUpdateWorkspace();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription ?? '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setDescription(initialDescription ?? '');
      setError(null);
    }
  }, [open, initialName, initialDescription]);

  const pending = create.isPending || update.isPending;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = CreateWorkspaceInput.safeParse({
      displayName: name,
      description: description.trim() ? description : undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Formulaire invalide');
      return;
    }

    try {
      if (mode === 'edit' && workspaceId) {
        await update.mutateAsync({
          id: workspaceId,
          input: { displayName: parsed.data.displayName, description: parsed.data.description ?? null },
        });
        toast.success('Espace de travail mis à jour');
      } else {
        await create.mutateAsync(parsed.data);
        toast.success('Espace de travail créé');
      }
      onClose();
    } catch (err) {
      toast.error(
        'Action impossible',
        err instanceof ApiRequestError ? err.message : undefined,
      );
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'edit' ? "Renommer l'espace de travail" : 'Nouvel espace de travail'}
      description={
        mode === 'edit' ? undefined : 'Regroupez vos tableaux par équipe ou par projet.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending} type="button">
            Annuler
          </Button>
          <Button type="submit" form="workspace-form" loading={pending}>
            {mode === 'edit' ? 'Enregistrer' : 'Créer'}
          </Button>
        </>
      }
    >
      <form id="workspace-form" onSubmit={submit} className="flex flex-col gap-4">
        <Input
          label="Nom"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Marketing, Produit, Perso…"
          error={error ?? undefined}
          autoComplete="off"
          maxLength={200}
        />
        <Textarea
          label="Description (facultatif)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="À quoi sert cet espace ?"
          maxLength={2000}
        />
      </form>
    </Modal>
  );
}
