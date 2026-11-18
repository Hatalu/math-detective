import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Hand } from 'lucide-react';
import type { CaseScene } from '../lib/cases';
import { useSettings } from '../lib/settings';
import { sfx } from '../lib/sound';
import { Art } from './art';

/** Hidden-object phase: students tap the clues hidden in the case scene; each clue gives one data value. */
export function SceneHunt({ scene, draftKey, onDone }: { scene: CaseScene; draftKey: string; onDone: () => void }) {
  const { s, motionOn } = useSettings();
  const items = scene.items;
  const key = draftKey + ':found';
  const [found, setFound] = useState<number[]>(() => { try { return JSON.parse(sessionStorage.getItem(key) ?? '[]'); } catch { return []; } });
  const [pop, setPop] = useState<number | null>(null);
  useEffect(() => { try { sessionStorage.setItem(key, JSON.stringify(found)); } catch { /* draft just isn't kept */ } }, [key, found]);
  const all = found.length === items.length;

  useEffect(() => {
    if (!all) return;
    sfx('stamp', s.muted);
    const t = setTimeout(onDone, motionOn ? 2000 : 800);
    return () => clearTimeout(t);
  }, [all]); // eslint-disable-line react-hooks/exhaustive-deps

  function take(i: number) {
    if (found.includes(i)) return;
    sfx('reveal', s.muted); setFound([...found, i]); setPop(i);
  }

  return (
    <div className="relative flex h-full w-full flex-col bg-navy text-cream">
      {/* instruction bar */}
      <div className="flex shrink-0 items-center gap-3 bg-navy p-2 px-3 shadow-xl">
        <Hand className="shrink-0 text-gold" aria-hidden />
        <p className="min-w-0 flex-1 font-bold leading-tight text-gold sm:text-lg">แตะหาเบาะแสที่ซ่อนอยู่ในฉากให้ครบ</p>
        <div className="shrink-0 text-center" aria-live="polite">
          <span className="font-num text-2xl font-black text-gold sm:text-3xl">{found.length}/{items.length}</span>
        </div>
      </div>

      {/* scene keeps the art's 16:9 ratio so items stay on the spots they were placed on */}
      <div className="grid min-h-0 flex-1 place-items-center overflow-hidden">
        <div className="relative aspect-video max-h-full w-full max-w-full [container-type:inline-size]" style={{ maxWidth: 'calc((100dvh - 9rem) * 16 / 9)' }}>
          <Art file={scene.bg} className="absolute inset-0 h-full w-full object-cover" fallback={<div className="absolute inset-0 bg-gradient-to-br from-dblue to-navy" />} />
          {items.map((it, i) => {
            const got = found.includes(i);
            return (
              <button key={i} type="button" onClick={() => take(i)} disabled={got || all}
                aria-label={got ? `${it.name}: ${it.value}` : 'เบาะแสที่ซ่อนอยู่'}
                className="absolute -translate-x-1/2 -translate-y-1/2 focus-visible:outline focus-visible:outline-4 focus-visible:outline-gold"
                style={{ left: `${it.x}%`, top: `${it.y}%`, width: `max(${it.w}cqw, 30px)` }}>
                <span className="block" style={{ transform: `rotate(${it.rot ?? 0}deg)`, opacity: got ? 0.35 : 1 }}>
                  <Art file={it.file} className="pointer-events-none w-full object-contain drop-shadow-[0_2px_3px_rgba(0,0,0,.6)]" fallback={<span className="block aspect-square rounded-full bg-gold/80" />} />
                </span>
                {got && (
                  <motion.span initial={{ scale: 0.3 }} animate={{ scale: 1 }}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-gold px-1.5 font-num text-sm font-black text-navy shadow-lg ring-2 ring-navy sm:text-lg">{it.value}</motion.span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* clues found so far */}
      <div className="flex min-h-[52px] shrink-0 flex-wrap items-center gap-1.5 bg-cream p-2 text-navy" aria-label="เบาะแสที่พบแล้ว">
        <span className="mr-1 text-sm font-semibold">พบแล้ว:</span>
        {found.map((i) => <span key={i} className="rounded-md bg-white px-2 font-num text-lg font-bold ring-1 ring-navy/20">{items[i].value}</span>)}
      </div>

      <AnimatePresence>
        {pop !== null && !all && (
          <motion.div key={pop} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            onAnimationComplete={() => setTimeout(() => setPop(null), 900)}
            className="pointer-events-none absolute left-1/2 top-16 z-10 -translate-x-1/2 rounded-xl bg-cream px-4 py-2 text-center text-navy shadow-xl ring-2 ring-gold">
            <div className="text-sm">พบ{items[pop].name}!</div>
            <b className="font-num text-2xl text-teal">{items[pop].value}</b>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {all && (
          <motion.div className="absolute inset-0 z-20 grid place-items-center bg-navy/80 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} role="status">
            <motion.div className="relative w-[min(70vmin,420px)]" initial={{ scale: 0.2, rotate: -25 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', bounce: 0.5 }}>
              <Art file="ui-found.webp" className="w-full object-contain drop-shadow-2xl" fallback={<div className="aspect-square rounded-full bg-gold" />} />
              <span className="absolute inset-x-0 top-[57%] text-center text-[min(7vmin,40px)] font-black text-white drop-shadow-[0_2px_0_#0B1B3F]">พบครบแล้ว!</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
