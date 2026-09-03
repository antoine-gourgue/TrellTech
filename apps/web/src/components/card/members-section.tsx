'use client';

import { Check, UserPlus } from 'lucide-react';
import type { PublicUser } from '@trelltech/shared';
import { useAssignMember, useBoardMembers, useUnassignMember } from '@/lib/hooks/use-card';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Popover } from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';

type Props = {
  cardId: string;
  boardId: string;
  members: PublicUser[];
};

export function MembersSection({ cardId, boardId, members }: Props) {
  const assign = useAssignMember({ cardId, boardId });
  const unassign = useUnassignMember({ cardId, boardId });
  const assignedIds = new Set(members.map((m) => m.id));

  function toggle(user: PublicUser) {
    if (assignedIds.has(user.id)) unassign.mutate(user.id);
    else assign.mutate(user);
  }

  return (
    <Popover
      title="Membres"
      trigger={({ toggle: t, ref, ...aria }) => (
        <Button ref={ref} variant="secondary" size="sm" onClick={t} {...aria}>
          <UserPlus className="size-4" aria-hidden />
          Membres
        </Button>
      )}
    >
      {() => <MemberPicker boardId={boardId} assignedIds={assignedIds} onToggle={toggle} />}
    </Popover>
  );
}

function MemberPicker({
  boardId,
  assignedIds,
  onToggle,
}: {
  boardId: string;
  assignedIds: Set<string>;
  onToggle: (user: PublicUser) => void;
}) {
  const { data, isLoading, isError } = useBoardMembers(boardId);

  if (isLoading) {
    return (
      <div className="grid place-items-center py-4">
        <Spinner className="size-5 text-brand" />
      </div>
    );
  }
  if (isError || !data) {
    return <p className="py-3 text-center text-sm text-text-muted">Membres indisponibles.</p>;
  }

  return (
    <ul className="flex flex-col gap-0.5">
      {data.map(({ user, role }) => {
        const checked = assignedIds.has(user.id);
        return (
          <li key={user.id}>
            <button
              type="button"
              onClick={() => onToggle(user)}
              aria-pressed={checked}
              className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-surface-muted"
            >
              <Avatar user={user} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-medium text-text">
                  {user.fullName ?? user.username}
                </span>
                <span className="block truncate text-xs text-text-muted">
                  @{user.username} · {role.toLowerCase()}
                </span>
              </span>
              {checked ? <Check className="size-4 shrink-0 text-brand" aria-hidden /> : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
