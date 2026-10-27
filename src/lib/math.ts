// Core mathematics engine. Pure functions; never mutate input arrays.
// Rounding policy: compute with full precision, round ONLY for display (2 dp, trailing zeros trimmed).
// Answer tolerance: a student value within 0.01 of the exact value is correct (so 2-dp rounding is accepted).
// Mode policy (ม.2 curriculum): if every distinct value occurs equally often, the data has no mode.

export type Measure = 'mean' | 'median' | 'mode';
export const MEASURE_TH: Record<Measure, string> = { mean: 'ค่าเฉลี่ยเลขคณิต', median: 'มัธยฐาน', mode: 'ฐานนิยม' };
export const TOLERANCE = 0.01;

export function validateData(data: readonly unknown[]): number[] {
  if (!Array.isArray(data) || data.length === 0) throw new Error('ชุดข้อมูลว่าง กรุณาใส่ตัวเลขอย่างน้อย 1 ค่า');
  return data.map((v, i) => {
    const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
    if (typeof n !== 'number' || !Number.isFinite(n)) throw new Error(`ข้อมูลตำแหน่งที่ ${i + 1} ไม่ใช่ตัวเลข`);
    return n;
  });
}

/** Parse "12, 15 18" → numbers (throws Thai error on bad input). */
export function parseDataText(text: string): number[] {
  return validateData(text.split(/[\s,]+/).filter(Boolean));
}

export const sortData = (data: readonly number[]): number[] => [...validateData(data)].sort((a, b) => a - b);

export function calculateMean(data: readonly number[]): number {
  const d = validateData(data);
  return d.reduce((s, x) => s + x, 0) / d.length;
}

export function calculateMedian(data: readonly number[]): number {
  const s = sortData(data);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** [value, count] pairs ordered by value. */
export function frequencies(data: readonly number[]): [number, number][] {
  const m = new Map<number, number>();
  for (const x of validateData(data)) m.set(x, (m.get(x) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => a[0] - b[0]);
}

/** Returns [] when there is no mode, one value, or several values (multimodal). */
export function calculateModes(data: readonly number[]): number[] {
  const f = frequencies(data);
  const max = Math.max(...f.map(([, c]) => c));
  if (f.every(([, c]) => c === max)) return [];
  return f.filter(([, c]) => c === max).map(([v]) => v);
}

export function round(x: number, dp = 2): number {
  const k = 10 ** dp;
  return Math.round((x + Number.EPSILON) * k) / k;
}
export const fmt = (x: number) => round(x).toLocaleString('th-TH', { maximumFractionDigits: 2 });

/** Seedable PRNG so a preview and a saved random dataset match. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface DatasetOptions {
  count: number; min: number; max: number; seed?: number;
  modeShape?: 'single' | 'multi' | 'none' | 'any';
}

export function generateDataset({ count, min, max, seed = Date.now(), modeShape = 'any' }: DatasetOptions): number[] {
  if (!Number.isInteger(count) || count < 2 || count > 60) throw new Error('จำนวนข้อมูลต้องอยู่ระหว่าง 2–60');
  if (!(max > min)) throw new Error('ค่าสูงสุดต้องมากกว่าค่าต่ำสุด');
  const span = Math.floor(max) - Math.ceil(min) + 1;
  if (modeShape === 'none' && span < count) throw new Error('ช่วงตัวเลขแคบเกินไปสำหรับข้อมูลที่ไม่มีฐานนิยม');
  const rnd = mulberry32(seed);
  const pick = () => Math.ceil(min) + Math.floor(rnd() * span);
  for (let tries = 0; tries < 2000; tries++) {
    const d = Array.from({ length: count }, pick);
    const modes = calculateModes(d);
    const ok = modeShape === 'any' || (modeShape === 'none' ? modes.length === 0 : modeShape === 'single' ? modes.length === 1 : modes.length >= 2);
    if (ok) return d;
  }
  throw new Error('สุ่มข้อมูลตามเงื่อนไขไม่สำเร็จ ลองขยายช่วงตัวเลขหรือเปลี่ยนจำนวนข้อมูล');
}

export interface ExpectedAnswer { measure: Measure; values: number[]; noMode: boolean }
export interface StudentAnswer { measure: Measure | null; values: number[]; noMode: boolean; markedEvidence?: number }

export function expectedFor(measure: Measure, data: readonly number[]): ExpectedAnswer {
  if (measure === 'mean') return { measure, values: [calculateMean(data)], noMode: false };
  if (measure === 'median') return { measure, values: [calculateMedian(data)], noMode: false };
  const m = calculateModes(data);
  return { measure, values: m, noMode: m.length === 0 };
}

export function valuesClose(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort((x, y) => x - y), sb = [...b].sort((x, y) => x - y);
  return sa.every((x, i) => Math.abs(x - sb[i]) <= TOLERANCE);
}

export function evaluateAnswer(expected: ExpectedAnswer, ans: StudentAnswer, askValue: boolean) {
  const measureCorrect = ans.measure === expected.measure;
  const valueCorrect = !askValue
    ? measureCorrect
    : expected.noMode ? ans.noMode : !ans.noMode && valuesClose(expected.values, ans.values);
  return { measureCorrect, valueCorrect };
}

// Must stay identical to the scoring inside supabase/schema.sql submit_answer().
export function reasoningScore(text: string): number {
  const n = [...text.trim()].length;
  return n >= 60 ? 25 : n >= 20 ? 15 : n > 0 ? 5 : 0;
}

export interface ScoreInput {
  measureCorrect: boolean; valueCorrect: boolean; markedEvidence: number; reasoning: string;
  hintsUsed: number; hintPenalty: number; communication?: number; speedBonus?: number;
}
export function calculateScore(i: ScoreInput) {
  const accuracy = i.valueCorrect ? 50 : 0;
  const method = (i.measureCorrect ? 10 : 0) + (i.markedEvidence > 0 ? 10 : 0);
  const reasoning = reasoningScore(i.reasoning);
  const communication = Math.min(5, Math.max(0, i.communication ?? 0));
  const speed = Math.min(5, Math.max(0, i.speedBonus ?? 0));
  const penalty = Math.max(0, i.hintsUsed) * Math.max(0, i.hintPenalty);
  return { accuracy, method, reasoning, communication, speed, penalty, total: Math.max(0, accuracy + method + reasoning + communication + speed - penalty) };
}

/** Clue templates use tokens so clues stay true when the teacher edits/randomises data. */
export function fillTemplate(text: string, data: readonly number[]): string {
  if (!data.length) return text;
  const modes = calculateModes(data);
  const f = frequencies(data);
  const maxCount = Math.max(...f.map(([, c]) => c));
  const s = sortData(data);
  const mid = Math.floor(s.length / 2);
  const tokens: Record<string, string> = {
    n: String(data.length),
    sum: fmt(data.reduce((a, b) => a + b, 0)),
    mean: fmt(calculateMean(data)),
    median: fmt(calculateMedian(data)),
    modes: modes.length ? modes.map(fmt).join(' และ ') : 'ไม่มี',
    modecount: String(maxCount),
    sorted: s.map(fmt).join(', '),
    middle: s.length % 2 ? fmt(s[mid]) : `${fmt(s[mid - 1])} และ ${fmt(s[mid])}`,
    min: fmt(s[0]),
    max: fmt(s[s.length - 1]),
  };
  return text.replace(/\{(\w+)\}/g, (m, k) => tokens[k] ?? m);
}

/** Step-by-step working, derived from data — used by the reveal animation and teacher answer key. */
export function calculationSteps(measure: Measure, data: readonly number[]): string[] {
  const s = sortData(data);
  if (measure === 'mean') {
    const sum = data.reduce((a, b) => a + b, 0);
    return [
      `รวมข้อมูลทั้งหมด: ${data.map(fmt).join(' + ')} = ${fmt(sum)}`,
      `จำนวนข้อมูล N = ${data.length}`,
      `ค่าเฉลี่ย = ${fmt(sum)} ÷ ${data.length} = ${fmt(calculateMean(data))}`,
    ];
  }
  if (measure === 'median') {
    const mid = Math.floor(s.length / 2);
    return [
      `เรียงข้อมูลจากน้อยไปมาก: ${s.map(fmt).join(', ')}`,
      s.length % 2
        ? `N = ${s.length} เป็นจำนวนคี่ ตำแหน่งกลางคือตำแหน่งที่ ${mid + 1}`
        : `N = ${s.length} เป็นจำนวนคู่ ตำแหน่งกลางคือตำแหน่งที่ ${mid} และ ${mid + 1}`,
      s.length % 2
        ? `มัธยฐาน = ${fmt(s[mid])}`
        : `มัธยฐาน = (${fmt(s[mid - 1])} + ${fmt(s[mid])}) ÷ 2 = ${fmt(calculateMedian(data))}`,
    ];
  }
  const f = frequencies(data);
  const modes = calculateModes(data);
  return [
    `นับความถี่: ${f.map(([v, c]) => `${fmt(v)}→${c}`).join(', ')}`,
    modes.length === 0
      ? 'ทุกค่ามีความถี่เท่ากัน จึงไม่มีค่าใดปรากฏบ่อยกว่าค่าอื่น'
      : `ความถี่สูงสุดคือ ${Math.max(...f.map(([, c]) => c))} ครั้ง`,
    modes.length === 0 ? 'ข้อมูลชุดนี้ไม่มีฐานนิยม' : `ฐานนิยม = ${modes.map(fmt).join(' และ ')}`,
  ];
}
