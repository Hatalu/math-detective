import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search } from 'lucide-react';
import type { QuestionContent } from '../lib/cases';
import { fmt } from '../lib/math';
import { useSettings } from '../lib/settings';
import { sfx } from '../lib/sound';
import { Art } from './art';
import { Btn } from './ui';

// What the data is hidden in, per built-in case. Teacher-made cases fall back to a note.
const ITEM: Record<string, { file: string; name: string }> = {
  'CASE 01': { file: 'item-document.webp', name: 'กระดาษคะแนน' },
  'CASE 02': { file: 'item-shoe.webp', name: 'รองเท้า' },
  'CASE 03': { file: 'item-slip.webp', name: 'ใบเสร็จ' },
  'CASE 04': { file: 'item-bus-ticket.webp', name: 'ตั๋วรถเมล์' },
  'CASE 05': { file: 'item-scale.webp', name: 'ตาชั่ง' },
  'CASE 06': { file: 'item-library-card.webp', name: 'บัตรห้องสมุด' },
  'CASE 07': { file: 'item-badge.webp', name: 'ป้ายชื่อผู้เล่น' },
  'CASE 08': { file: 'item-photo.webp', name: 'รูปถ่ายนักเรียน' },
};
export const huntItem = (code: string) => ITEM[code] ?? { file: 'item-note.webp', name: 'โน้ต' };

/** Seeded so every phone in the class sees the same hiding spots. */
function rng(seed: string) {
  let h = 1779033703;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 3432918353);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}

// easy = big and bright, hard = small, faded, tilted
const LEVEL = [
  { w: 10, opacity: 1, filter: 'drop-shadow(0 0 8px #F5C04A)' },
  { w: 7, opacity: 0.85, filter: 'brightness(.85)' },
  { w: 4.5, opacity: 0.55, filter: 'brightness(.6) saturate(.6)' },
];

export function spots(code: string, n: number) {
  const r = rng(code);
  const out: { x: number; y: number; lv: number; rot: number }[] = [];
  for (let i = 0; i < n; i++) {
    let x = 0, y = 0;
    for (let t = 0; t < 60; t++) { // keep spots apart so items never stack
      x = 6 + r() * 86; y = 14 + r() * 74;
      if (out.every((p) => Math.hypot(p.x - x, (p.y - y) * 0.56) > 9)) break;
    }
    out.push({ x, y, lv: i % 3, rot: (r() - 0.5) * 60 });
  }
  return out;
}

/** Hidden-object phase: the numbers are not given, students find them in the case scene. */
export function SceneHunt({ q, draftKey, onDone }: { q: QuestionContent; draftKey: string; onDone: () => void }) {
  const { s } = useSettings();
  const item = huntItem(q.code);
  const pos = useMemo(() => spots(q.code, q.data.length), [q.code, q.data.length]);
  const key = draftKey + ':found';
  const [found, setFound] = useState<number[]>(() => { try { return JSON.parse(sessionStorage.getItem(key) ?? '[]'); } catch { return []; } });
  const [pop, setPop] = useState<number | null>(null);
  useEffect(() => { try { sessionStorage.setItem(key, JSON.stringify(found)); } catch { /* draft just isn't kept */ } }, [key, found]);
  const all = found.length === q.data.length;

  function take(i: number) {
    if (found.includes(i)) return;
    sfx('reveal', s.muted); setFound([...found, i]); setPop(i);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-navy p-3 text-cream shadow-lg">
        <span className="rounded-md bg-gold px-3 py-1 font-num font-bold text-navy">{q.code}</span>
        <h2 className="flex-1 text-lg font-bold sm:text-xl">{q.title}</h2>
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-lg font-bold" aria-live="polite">
          <Search size={18} aria-hidden /> หาข้อมูลจาก
          <Art file={item.file} className="h-9 w-9 object-contain" fallback={<span>{item.name}</span>} alt={item.name} />
          <span className="font-num text-gold">{found.length}/{q.data.length}</span>
        </span>
      </div>
      <p className="text-sm opacity-80">{q.story} แตะ{item.name}ที่ซ่อนอยู่ในฉากให้ครบ บางชิ้นเห็นง่าย บางชิ้นเล็กและกลืนไปกับฉาก ตัวเลขที่พบคือ{q.dataLabel}</p>

      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-gradient-to-br from-dblue to-navy shadow-xl ring-4 ring-navy">
        <Art file={`${q.code.toLowerCase().replace(/\s/g, '')}-bg.webp`} className="absolute inset-0 h-full w-full object-cover" />
        {pos.map((p, i) => {
          const L = LEVEL[p.lv], got = found.includes(i);
          return (
            <button key={i} type="button" onClick={() => take(i)} disabled={got || all}
              aria-label={got ? `${item.name}ชิ้นที่ ${i + 1}: ${fmt(q.data[i])} ${q.unit}` : `${item.name}ที่ซ่อนอยู่`}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline focus-visible:outline-4 focus-visible:outline-gold"
              style={{ left: `${p.x}%`, top: `${p.y}%`, width: `max(${L.w}%, 30px)` }}>
              {got ? (
                <span className="block rounded-lg bg-gold px-1 py-0.5 text-center font-num text-sm font-black text-navy shadow-lg ring-2 ring-navy sm:text-lg">{fmt(q.data[i])}</span>
              ) : (
                <span className="block" style={{ transform: `rotate(${p.rot}deg)`, opacity: L.opacity, filter: L.filter }}>
                  <Art file={item.file} className="pointer-events-none w-full object-contain" fallback={<span className="block aspect-square rounded-full bg-gold/70" />} />
                </span>
              )}
            </button>
          );
        })}
        <AnimatePresence>
          {pop !== null && (
            <motion.div key={pop} initial={{ opacity: 0, scale: 0.5, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }}
              onAnimationComplete={() => setTimeout(() => setPop(null), 900)}
              className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-xl bg-cream px-4 py-2 text-center text-navy shadow-xl ring-2 ring-gold">
              พบ{item.name}! <b className="font-num text-2xl text-teal">{fmt(q.data[pop])}</b> {q.unit}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-wrap items-center gap-2" aria-label="ข้อมูลที่พบแล้ว">
        {found.map((i) => <span key={i} className="rounded-lg bg-cream px-3 py-1 font-num text-lg font-bold text-navy ring-1 ring-navy/20">{fmt(q.data[i])}</span>)}
        {all && <Btn className="ml-auto" onClick={() => { sfx('stamp', s.muted); onDone(); }}>ได้ข้อมูลครบแล้ว เปิดโจทย์ →</Btn>}
      </div>
    </div>
  );
}
