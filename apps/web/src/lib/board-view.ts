import type { Card } from '@trelltech/shared';

export type BoardViewMode = 'board' | 'calendar' | 'table';

export type DueFilter = 'any' | 'has' | 'overdue';

export type BoardFilters = {
  labelIds: string[];
  memberIds: string[];
  due: DueFilter;
};

export const EMPTY_FILTERS: BoardFilters = { labelIds: [], memberIds: [], due: 'any' };

const VIEW_MODES: BoardViewMode[] = ['board', 'calendar', 'table'];

function storageKey(boardId: string): string {
  return `trelltech:board-view:${boardId}`;
}

export function readViewMode(boardId: string): BoardViewMode {
  if (typeof window === 'undefined') return 'board';
  try {
    const value = window.localStorage.getItem(storageKey(boardId));
    if (value && VIEW_MODES.includes(value as BoardViewMode)) {
      return value as BoardViewMode;
    }
  } catch {
    /* localStorage indisponible */
  }
  return 'board';
}

export function writeViewMode(boardId: string, mode: BoardViewMode): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(boardId), mode);
  } catch {
    /* localStorage indisponible */
  }
}

export function filtersActive(filters: BoardFilters): boolean {
  return filters.labelIds.length > 0 || filters.memberIds.length > 0 || filters.due !== 'any';
}

export function countActiveFilters(filters: BoardFilters): number {
  return (
    filters.labelIds.length + filters.memberIds.length + (filters.due !== 'any' ? 1 : 0)
  );
}

export function isOverdue(card: Card): boolean {
  if (!card.dueDate || card.dueComplete) return false;
  const due = new Date(card.dueDate).getTime();
  return Number.isFinite(due) && due < Date.now();
}

export function matchesFilters(card: Card, filters: BoardFilters): boolean {
  if (filters.labelIds.length > 0) {
    const hasLabel = card.labels.some((label) => filters.labelIds.includes(label.id));
    if (!hasLabel) return false;
  }
  if (filters.memberIds.length > 0) {
    const hasMember = card.members.some((member) => filters.memberIds.includes(member.id));
    if (!hasMember) return false;
  }
  if (filters.due === 'has' && !card.dueDate) return false;
  if (filters.due === 'overdue' && !isOverdue(card)) return false;
  return true;
}
