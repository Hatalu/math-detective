import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Hand } from 'lucide-react';
import type { QuestionContent } from '../lib/cases';
import { fmt } from '../lib/math';
import { useSettings } from '../lib/settings';
import { sfx } from '../lib/sound';
import { Art } from './art';

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

// easy = big and bright, hard = small, faded, tilted (width in % of the scene's short side)
const LEVEL = [
  { w: 16, opacity: 1, filter: 'drop-shadow(0 0 8px #F5C04A)' },
  { w: 11, opacity: 0.85, filter: 'brightness(.85)' },
  { w: 7, opacity: 0.55, filter: 'brightness(.6) saturate(.6)' },
];

export function spots(code: string, n: number) {
  const r = rng(code);
  const out: { x: number; y: number; lv: number; rot: number }[] = [];
  for (let i = 0; i < n; i++) {
    let x = 0, y = 0;
    for (let t = 0; t < 60; t++) { // keep spots apart so items never stack; y range leaves room for the top/bottom bars
      x = 8 + r() * 84; y = 22 + r() * 56;
      if (out.every((p) => Math.hypot(p.x - x, p.y - y) > 11)) break;
    }
    out.push({ x, y, lv: i % 3, rot: (r() - 0.5) * 60 });
  }
  return out;
}

/** Hidden-object phase: the numbers are not given, students find them in the case scene. Fills its parent. */
export function SceneHunt({ q, draftKey, onDone }: { q: QuestionContent; draftKey: string; onDone: () => void }) {
  const { s, motionOn } = useSettings();
  const item = huntItem(q.code);
  const pos = useMemo(() => spots(q.code, q.data.length), [q.code, q.data.length]);
  const key = draftKey + ':found';
  const [found, setFound] = useState<number[]>(() => { try { return JSON.parse(sessionStorage.getItem(key) ?? '[]'); } catch { return []; } });
  const [pop, setPop] = useState<number | null>(null);
  useEffect(() => { try { sessionStorage.setItem(key, JSON.stringify(found)); } catch { /* draft just isn't kept */ } }, [key, found]);
  const all = found.length === q.data.length;
  const left = q.data.length - found.length;

  // all found: celebrate, then go to the case on its own
  useEffect(() => {
    if (!all) return;
    sfx('stamp', s.muted);
    const t = setTimeout(onDone, motionOn ? 2200 : 900);
    return () => clearTimeout(t);
  }, [all]); // eslint-disable-line react-hooks/exhaustive-deps

  function take(i: number) {
    if (found.includes(i)) return;
    sfx('reveal', s.muted); setFound([...found, i]); setPop(i);
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-dblue to-navy text-cream [container-type:size]">
      <Art file={`${q.code.toLowerCase().replace(/\s/g, '')}-bg.webp`} className="absolute inset-0 h-full w-full object-cover" />

      {pos.map((p, i) => {
        const L = LEVEL[p.lv], got = found.includes(i);
        return (
          <button key={i} type="button" onClick={() => take(i)} disabled={got || all}
            aria-label={got ? `${item.name}ชิ้นที่ ${i + 1}: ${fmt(q.data[i])} ${q.unit}` : `${item.name}ที่ซ่อนอยู่`}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline focus-visible:outline-4 focus-visible:outline-gold"
            style={{ left: `${p.x}%`, top: `${p.y}%`, width: `max(${L.w}cqmin, 34px)` }}>
            {got ? (
              <motion.span initial={{ scale: 0.3 }} animate={{ scale: 1 }} className="block rounded-lg bg-gold px-1 py-0.5 text-center font-num text-base font-black text-navy shadow-lg ring-2 ring-navy sm:text-xl">{fmt(q.data[i])}</motion.span>
            ) : (
              <span className="block" style={{ transform: `rotate(${p.rot}deg)`, opacity: L.opacity, filter: L.filter }}>
                <Art file={item.file} className="pointer-events-none w-full object-contain" fallback={<span className="block aspect-square rounded-full bg-gold/70" />} />
              </span>
            )}
          </button>
        );
      })}

      {/* instruction bar */}
      <div className="absolute inset-x-2 top-2 flex items-center gap-3 rounded-2xl bg-navy/90 p-2 pr-4 shadow-xl ring-2 ring-gold/60 backdrop-blur sm:inset-x-4 sm:top-3">
        <Art file={item.file} className="h-12 w-12 shrink-0 rounded-xl bg-cream/90 object-contain p-1 sm:h-14 sm:w-14" alt={item.name} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 font-bold leading-tight text-gold sm:text-lg"><Hand size={18} aria-hidden /> ภารกิจ: แตะหา{item.name}ที่ซ่อนอยู่ในภาพให้ครบ</p>
          <p className="text-xs leading-snug opacity-90 sm:text-sm">ตัวเลขบน{item.name}คือ {q.dataLabel} · บางชิ้นเล็กและกลืนไปกับฉาก ดูให้ดี!</p>
        </div>
        <div className="shrink-0 text-center" aria-live="polite">
          <div className="font-num text-2xl font-black text-gold sm:text-3xl">{found.length}/{q.data.length}</div>
          <div className="text-[11px] opacity-80">{all ? 'ครบแล้ว' : `เหลือ ${left} ชิ้น`}</div>
        </div>
      </div>

      {/* numbers found so far */}
      {found.length > 0 && (
        <div className="absolute inset-x-2 bottom-2 flex flex-wrap items-center gap-1.5 rounded-2xl bg-cream/90 p-2 text-navy shadow-xl sm:inset-x-4 sm:bottom-3" aria-label="ข้อมูลที่พบแล้ว">
          <span className="mr-1 text-sm font-semibold">พบแล้ว:</span>
          {found.map((i) => <span key={i} className="rounded-md bg-white px-2 font-num text-lg font-bold ring-1 ring-navy/20">{fmt(q.data[i])}</span>)}
        </div>
      )}

      <AnimatePresence>
        {pop !== null && !all && (
          <motion.div key={pop} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            onAnimationComplete={() => setTimeout(() => setPop(null), 800)}
            className="pointer-events-none absolute left-1/2 top-[22%] -translate-x-1/2 rounded-xl bg-cream px-4 py-2 text-center text-navy shadow-xl ring-2 ring-gold">
            พบ{item.name}! <b className="font-num text-2xl text-teal">{fmt(q.data[pop])}</b> {q.unit}
          </motion.div>
        )}
      </AnimatePresence>

      {/* all found celebration */}
      <AnimatePresence>
        {all && (
          <motion.div className="absolute inset-0 z-10 grid place-items-center bg-navy/75 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} role="status">
            <motion.div className="relative w-[min(70cqmin,420px)]" initial={{ scale: 0.2, rotate: -25 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', bounce: 0.5 }}>
              <Art file="ui-found.webp" className="w-full object-contain drop-shadow-2xl" fallback={<div className="aspect-square rounded-full bg-gold" />} />
              <span className="absolute inset-x-0 top-[57%] text-center text-[min(7cqmin,40px)] font-black text-white drop-shadow-[0_2px_0_#0B1B3F]">พบครบแล้ว!</span>
            </motion.div>
            <motion.p className="absolute bottom-[12%] text-center text-lg font-bold" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              ได้ข้อมูลครบ {q.data.length} ค่า กำลังเปิดแฟ้มคดี…
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
