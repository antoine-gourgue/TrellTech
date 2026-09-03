import { formatDistanceToNow, format, isValid, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

function toDate(value: string): Date | null {
  const date = parseISO(value);
  return isValid(date) ? date : null;
}

export function relativeTime(value: string): string {
  const date = toDate(value);
  if (!date) return '';
  return formatDistanceToNow(date, { addSuffix: true, locale: fr });
}

export function shortDate(value: string): string {
  const date = toDate(value);
  if (!date) return '';
  return format(date, 'd MMM', { locale: fr });
}

export function fullDate(value: string): string {
  const date = toDate(value);
  if (!date) return '';
  return format(date, "d MMMM yyyy 'à' HH:mm", { locale: fr });
}

export function toDateInputValue(value: string | null): string {
  if (!value) return '';
  const date = toDate(value);
  if (!date) return '';
  return format(date, 'yyyy-MM-dd');
}

export function fromDateInputValue(value: string): string | null {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  return isValid(date) ? date.toISOString() : null;
}
