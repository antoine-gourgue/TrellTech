import { describe, expect, it } from 'vitest';
import { POSITION_STEP, positionAtEnd, positionBetween } from '../src/lib/position.js';

describe('positionBetween', () => {
  it('renvoie un pas par défaut pour une liste vide', () => {
    expect(positionBetween(null, null)).toBe(POSITION_STEP);
  });

  it('place en tête en divisant par deux', () => {
    expect(positionBetween(null, 100)).toBe(50);
  });

  it('place en fin en ajoutant un pas', () => {
    expect(positionBetween(1000, null)).toBe(1000 + POSITION_STEP);
  });

  it('place entre deux voisins par la moyenne', () => {
    expect(positionBetween(100, 200)).toBe(150);
  });

  it('reste strictement ordonné entre voisins proches', () => {
    const before = 100;
    const after = 101;
    const mid = positionBetween(before, after);
    expect(mid).toBeGreaterThan(before);
    expect(mid).toBeLessThan(after);
  });
});

describe('positionAtEnd', () => {
  it('renvoie un pas quand la liste est vide', () => {
    expect(positionAtEnd(null)).toBe(POSITION_STEP);
  });

  it('ajoute un pas à la dernière position', () => {
    expect(positionAtEnd(3 * POSITION_STEP)).toBe(4 * POSITION_STEP);
  });
});
