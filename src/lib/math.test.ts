import { describe, it, expect } from 'vitest';
import { calculateMean, calculateMedian, calculateModes, sortData, generateDataset, evaluateAnswer, calculateScore, expectedFor, fillTemplate, parseDataText } from './math';
import { DEFAULT_CASES, answerKey } from './cases';

describe('math engine', () => {
  it('mean/median/mode basics', () => {
    expect(calculateMean([2, 4, 9])).toBe(5);
    expect(calculateMedian([9, 1, 5])).toBe(5);
    expect(calculateMedian([4, 1, 3, 2])).toBe(2.5);
    expect(calculateModes([1, 2, 2, 3])).toEqual([2]);
    expect(calculateModes([1, 1, 2, 2, 3])).toEqual([1, 2]);
    expect(calculateModes([1, 2, 3])).toEqual([]);
    expect(calculateModes([2, 2, 3, 3])).toEqual([]);
  });
  it('does not mutate input', () => {
    const d = [3, 1, 2];
    sortData(d); calculateMedian(d);
    expect(d).toEqual([3, 1, 2]);
  });
  it('rejects empty and non-numeric data', () => {
    expect(() => calculateMean([])).toThrow();
    expect(() => parseDataText('1, a, 3')).toThrow();
    expect(parseDataText('1, 2 3')).toEqual([1, 2, 3]);
  });
  it('generateDataset honours mode shape and seed', () => {
    for (let s = 1; s < 30; s++) {
      expect(calculateModes(generateDataset({ count: 7, min: 1, max: 20, seed: s, modeShape: 'none' }))).toEqual([]);
      expect(calculateModes(generateDataset({ count: 9, min: 1, max: 10, seed: s, modeShape: 'single' }))).toHaveLength(1);
    }
    expect(generateDataset({ count: 5, min: 1, max: 9, seed: 42 })).toEqual(generateDataset({ count: 5, min: 1, max: 9, seed: 42 }));
  });
  it('evaluate + score', () => {
    const exp = expectedFor('mean', [15, 16, 17]);
    expect(evaluateAnswer(exp, { measure: 'mean', values: [16], noMode: false }, true)).toEqual({ measureCorrect: true, valueCorrect: true });
    expect(evaluateAnswer(expectedFor('mean', [1, 2, 2]), { measure: 'mean', values: [1.67], noMode: false }, true).valueCorrect).toBe(true);
    expect(evaluateAnswer(expectedFor('mode', [1, 2, 3]), { measure: 'mode', values: [], noMode: true }, true).valueCorrect).toBe(true);
    const s = calculateScore({ measureCorrect: true, valueCorrect: true, markedEvidence: 1, reasoning: 'x'.repeat(60), hintsUsed: 2, hintPenalty: 5 });
    expect(s.total).toBe(50 + 20 + 25 - 10);
    expect(calculateScore({ measureCorrect: false, valueCorrect: false, markedEvidence: 0, reasoning: '', hintsUsed: 3, hintPenalty: 5 }).total).toBe(0);
  });
  it('templates use real data', () => {
    expect(fillTemplate('{modes} x{modecount} n={n} mid={middle}', [36, 38, 38, 38, 40, 42])).toBe('38 x3 n=6 mid=38 และ 38');
  });
});

describe('default cases are mathematically consistent', () => {
  const expected: Record<string, number[]> = {
    'CASE 01': [16], 'CASE 02': [38], 'CASE 03': [380], 'CASE 04': [10.5],
    'CASE 05': [], 'CASE 06': [4, 6], 'CASE 07': [154], 'CASE 08': [15.5],
  };
  for (const c of DEFAULT_CASES) {
    it(c.code, () => {
      const k = answerKey(c);
      expect(k.values).toEqual(expected[c.code]);
      expect(k.noMode).toBe(c.code === 'CASE 05');
      // every token must resolve, so no "{...}" survives templating
      expect(c.clues.map((t) => fillTemplate(t, c.data)).join(' ')).not.toMatch(/\{\w+\}/);
    });
  }
  it('case 03 mean really is 660 as the story claims', () => expect(calculateMean(DEFAULT_CASES[2].data)).toBe(660));
});
