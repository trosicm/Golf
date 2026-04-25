import { describe, it, expect } from 'vitest';
/// <reference types="vitest" />
import { getHandicapStrokes, calculateNetScore, calculateHolePot } from '../src/domain/bets';

describe('Apuestas - reglas básicas', () => {
  it('Handicap strokes', () => {
    expect(getHandicapStrokes(8, 4)).toBe(1);
    expect(getHandicapStrokes(8, 14)).toBe(0);
    expect(getHandicapStrokes(22, 3)).toBe(2);
  });

  it('Net score', () => {
    expect(calculateNetScore(90, 10)).toBe(80);
  });

  it('Hole pot', () => {
    const purchases = [{ cost: 10 }, { cost: 5 }];
    expect(calculateHolePot(100, 20, purchases)).toBe(135);
  });
});