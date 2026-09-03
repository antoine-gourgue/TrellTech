import { Skeleton } from '@/components/ui/skeleton';

export function BoardSkeleton() {
  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col lg:h-dvh">
      <div className="flex items-center gap-3 px-5 py-4 sm:px-8">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="ml-auto size-9" />
      </div>
      <div className="flex flex-1 items-start gap-4 overflow-hidden px-5 sm:px-8">
        {Array.from({ length: 3 }).map((_, columnIndex) => (
          <div
            key={columnIndex}
            className="flex w-72 shrink-0 flex-col gap-2 rounded-lg border border-border bg-surface-muted p-2"
          >
            <Skeleton className="mb-1 h-7 w-32" />
            {Array.from({ length: 3 - columnIndex }).map((_, cardIndex) => (
              <Skeleton key={cardIndex} className="h-16 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
