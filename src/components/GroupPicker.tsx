import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Shuffle, X } from 'lucide-react';
import { useSettings } from '../lib/settings';
import { sfx } from '../lib/sound';
import { Btn } from './ui';

/** Running-light random pick: a light hops tile to tile, slows down, and stops on the chosen group. */
export function GroupPicker({ names, onPick, onClose }: { names: string[]; onPick: (i: number) => void; onClose: () => void }) {
  const { s, motionOn } = useSettings();
  const [at, setAt] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);

  function spin() {
    if (!names.length) return;
    setDone(false); setSpinning(true);
    const target = Math.floor(Math.random() * names.length);
    const start = at ?? 0;
    // at least 3 laps, landing exactly on target
    const steps = motionOn ? names.length * 3 + ((target - start + names.length) % names.length) : 0;
    let k = 0;
    const tick = () => {
      if (k >= steps) { setAt(target); setDone(true); setSpinning(false); sfx('correct', s.muted); onPick(target); return; }
      k++; setAt((start + k) % names.length); sfx('click', s.muted);
      const left = steps - k; // slow down over the last ~12 hops
      timer.current = setTimeout(tick, left > 12 ? 70 : 70 + (12 - left) * 35);
    };
    tick();
  }

  return (
    <motion.div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-navy/95 p-6 text-cream" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label="สุ่มกลุ่มตอบ">
      <h2 className="text-3xl font-black text-gold sm:text-4xl">สุ่มกลุ่มตอบคำถาม</h2>
      <div className="grid w-full max-w-5xl grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {names.map((n, i) => {
          const on = at === i;
          return (
            <motion.div key={n + i} animate={on && done ? { scale: [1, 1.15, 1.08] } : { scale: on ? 1.05 : 1 }} transition={{ duration: on && done ? 0.5 : 0.08 }}
              className={`relative grid min-h-[96px] place-items-center rounded-2xl border-4 p-3 text-center text-2xl font-black transition-colors duration-75 sm:text-3xl
              ${on ? 'border-gold bg-gold text-navy shadow-[0_0_40px_10px_rgba(245,192,74,.7)]' : 'border-white/20 bg-white/10'} ${done && !on ? 'opacity-40' : ''}`}>
              {n}
              {/* bulb lights around the frame */}
              <span className={`absolute -top-2 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full ${on ? 'bg-white shadow-[0_0_12px_4px_#fff]' : 'bg-white/30'}`} />
              <span className={`absolute -bottom-2 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full ${on ? 'bg-white shadow-[0_0_12px_4px_#fff]' : 'bg-white/30'}`} />
            </motion.div>
          );
        })}
      </div>
      <p className="h-12 text-3xl font-black" aria-live="polite">{done && at !== null ? `🎉 ${names[at]} ตอบ!` : ''}</p>
      <div className="flex gap-3">
        <Btn onClick={spin} disabled={!names.length || spinning}><Shuffle aria-hidden /> {spinning ? 'กำลังสุ่ม…' : done ? 'สุ่มอีกครั้ง' : 'สุ่ม!'}</Btn>
        <Btn variant="ghost" onClick={onClose}><X aria-hidden /> ปิด</Btn>
      </div>
      {!names.length && <p>ยังไม่มีกลุ่มให้สุ่ม</p>}
    </motion.div>
  );
}
