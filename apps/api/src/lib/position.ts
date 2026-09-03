export const POSITION_STEP = 65536;

/**
 * Calcule une position flottante façon Trello entre deux voisins optionnels.
 * En début de liste on divise par deux, en fin on ajoute un pas fixe.
 */
export function positionBetween(before: number | null, after: number | null): number {
  if (before == null && after == null) return POSITION_STEP;
  if (before == null) return (after as number) / 2;
  if (after == null) return before + POSITION_STEP;
  return (before + after) / 2;
}

/** Position à ajouter en fin d'une liste dont on connaît la dernière position. */
export function positionAtEnd(last: number | null): number {
  return last == null ? POSITION_STEP : last + POSITION_STEP;
}
