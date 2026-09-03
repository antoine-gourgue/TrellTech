import { Bell, CalendarClock, MessageSquare, UserPlus, type LucideIcon } from 'lucide-react';

export function notificationIcon(type: string): LucideIcon {
  if (type.includes('comment')) return MessageSquare;
  if (type.includes('assign')) return UserPlus;
  if (type.includes('due')) return CalendarClock;
  return Bell;
}
