import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, animate, useMotionValue, useTransform } from 'framer-motion';
import { FastForward, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { useDur, useSettings } from '../lib/settings';
import { sfx } from '../lib/sound';
import { Cody } from './characters';
import { Art, CutVideo } from './art';

/* ---------- Sequence state machine ---------- */
export interface Step { id: string; ms?: number } // last step without ms = hold for user

export function useSequence(steps: Step[], active = true) {
  const { s, motionOn } = useSettings();
  const [i, setI] = useState(motionOn ? 0 : steps.length - 1);
  useEffect(() => {
    if (!active) return;
    if (!motionOn) { setI(steps.length - 1); return; }
    const ms = steps[i]?.ms;
    if (ms === undefined) return;
    const t = setTimeout(() => setI((x) => Math.min(x + 1, steps.length - 1)), ms / s.speed);
    return () => clearTimeout(t);
  }, [i, motionOn, s.speed, active, steps]);
  const at = (id: string) => i >= steps.findIndex((x) => x.id === id);
  return { i, step: steps[i].id, at, done: i === steps.length - 1, skip: () => setI(steps.length - 1), replay: () => setI(0) };
}

export function SkipCutsceneButton({ onSkip, label = 'ข้ามฉาก' }: { onSkip: () => void; label?: string }) {
  return (
    <button onClick={onSkip} className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-black/55 px-4 py-2 font-semibold text-cream ring-2 ring-cream/60 backdrop-blur hover:bg-black/70 focus-visible:outline focus-visible:outline-4 focus-visible:outline-gold">
      <FastForward size={18} aria-hidden /> {label}
    </button>
  );
}

export function CutsceneControls({ onSkip, onReplay, done }: { onSkip: () => void; onReplay: () => void; done: boolean }) {
  const { s, set } = useSettings();
  const iconBtn = 'grid h-11 w-11 place-items-center rounded-full bg-black/55 text-cream ring-2 ring-cream/40 hover:bg-black/70';
  return (
    <div className="absolute right-3 top-3 z-50 flex gap-2 sm:right-5 sm:top-5">
      <button className={iconBtn} onClick={() => set({ muted: !s.muted })} aria-label={s.muted ? 'เปิดเสียง' : 'ปิดเสียง'}>{s.muted ? <VolumeX aria-hidden /> : <Volume2 aria-hidden />}</button>
      {done ? <button className={iconBtn} onClick={onReplay} aria-label="เล่นฉากซ้ำ"><RotateCcw aria-hidden /></button> : <SkipCutsceneButton onSkip={onSkip} />}
    </div>
  );
}

/** Generic overlay cutscene (case open / clue / correct / wrong / mission pass / final). Always skippable. */
export function CinematicSequence({ steps, onDone, children, tone = 'dark', bg, video }: {
  steps: Step[]; onDone: () => void; tone?: 'dark' | 'light'; bg?: string; video?: string; children: (q: ReturnType<typeof useSequence>) => ReactNode;
}) {
  const q = useSequence(steps);
  return (
    <motion.div role="dialog" aria-modal="true" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className={`fixed inset-0 z-[60] overflow-hidden backdrop-blur-sm ${tone === 'dark' ? 'bg-navy/95 text-cream' : 'bg-cream/95 text-navy'}`}>
      {bg && <Art file={bg} className="absolute inset-0 h-full w-full object-cover opacity-40" />}
      {video && <CutVideo file={video} className="absolute inset-0 h-full w-full object-cover opacity-60" />}
      <CutsceneControls onSkip={q.skip} onReplay={q.replay} done={q.done} />
      <div className="relative flex h-full w-full items-center justify-center p-4">{children(q)}</div>
      {q.done && (
        <div className="absolute inset-x-0 bottom-6 flex justify-center">
          <button autoFocus onClick={onDone} className="min-h-[48px] rounded-xl bg-gold px-8 font-bold text-navy shadow-[0_4px_0_#b5740a]">ไปต่อ</button>
        </div>
      )}
    </motion.div>
  );
}

/* ---------- Layers & scene ---------- */
export function SceneLayer({ depth, camX, children, className = '' }: { depth: number; camX: number; children: ReactNode; className?: string }) {
  const dur = useDur();
  return <motion.div className={`absolute inset-0 ${className}`} animate={{ x: camX * depth }} transition={{ duration: dur(3), ease: 'easeInOut' }}>{children}</motion.div>;
}

export function HQScene({ camX = 0, zoom = 1, lamp = true, rain = true, children }: { camX?: number; zoom?: number; lamp?: boolean; rain?: boolean; children?: ReactNode }) {
  const dur = useDur();
  return (
    <motion.div className="absolute inset-0 overflow-hidden bg-navy" animate={{ scale: zoom }} transition={{ duration: dur(2.5), ease: 'easeInOut' }}>
      {/* background: wall, rainy window, evidence board */}
      <SceneLayer depth={0.3} camX={camX} className="-inset-x-[10%]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,#263C68_0%,#14213D_60%,#0b1426_100%)]" />
        <div className="absolute left-[8%] top-[8%] h-[52%] w-[30%] overflow-hidden rounded-t-[40%] border-[10px] border-[#3a2a1c] bg-[#0e1a33] shadow-inner">
          <div className="absolute right-[18%] top-[14%] h-14 w-14 rounded-full bg-cream/80 blur-[2px] shadow-[0_0_60px_20px_rgba(255,248,232,.25)]" />
          <div className="absolute bottom-0 h-1/3 w-full bg-[linear-gradient(transparent,#0a1222)]">
            {[10, 25, 45, 62, 80].map((l, k) => <div key={k} className="absolute bottom-0 bg-[#16233f]" style={{ left: `${l}%`, width: '12%', height: `${40 + (k * 17) % 50}%` }}><div className="m-1 h-1.5 w-1.5 bg-gold/70" /></div>)}
          </div>
          {rain && <div className="rain absolute inset-0" />}
          <div className="absolute inset-y-0 left-1/2 w-2 -translate-x-1/2 bg-[#3a2a1c]" /><div className="absolute inset-x-0 top-1/2 h-2 bg-[#3a2a1c]" />
        </div>
        <div className="absolute right-[8%] top-[10%] h-[48%] w-[38%] rounded-md border-8 border-[#5b3d24] bg-[#b48a5a] p-3 shadow-2xl">
          {[[8, 12, -4], [40, 8, 3], [70, 18, -2], [20, 55, 5], [58, 52, -3]].map(([l, t, r], k) => (
            <div key={k} className="absolute h-[30%] w-[24%] bg-cream shadow" style={{ left: `${l}%`, top: `${t}%`, rotate: `${r}deg` }}>
              <div className="absolute left-1/2 top-1 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-alert" />
              <div className="mt-5 flex h-[60%] items-end justify-center gap-1 px-2">{[40, 70, 55, 90].map((h, j) => <div key={j} className="w-2 bg-dblue/70" style={{ height: `${(h + k * 9) % 100}%` }} />)}</div>
            </div>
          ))}
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <path d="M20 15 L52 11 L82 21 M20 15 L32 58 L70 55 L82 21" stroke="#B93838" strokeWidth=".7" fill="none" />
          </svg>
        </div>
      </SceneLayer>
      <Art file="hq-bg.webp" className="absolute inset-0 h-full w-full object-cover" />
      {/* volumetric lamp light */}
      <motion.div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_62%_62%,rgba(252,163,17,.38),transparent_55%)] mix-blend-screen"
        animate={{ opacity: lamp ? 1 : 0 }} transition={{ duration: dur(0.6) }} />
      {/* desk foreground */}
      <SceneLayer depth={1} camX={camX}>
        <div className="absolute bottom-0 left-[-5%] h-[30%] w-[110%] bg-[linear-gradient(#6b4527,#3d2614)] shadow-[0_-10px_30px_rgba(0,0,0,.5)]">
          <div className="absolute left-[60%] top-[-120%] h-[120%] w-24" aria-hidden>
            <div className="absolute bottom-0 left-1/2 h-3 w-16 -translate-x-1/2 rounded-full bg-[#8a6420]" />
            <div className="absolute bottom-2 left-1/2 h-[70%] w-1.5 -translate-x-1/2 bg-[#8a6420]" />
            <div className="absolute left-0 top-[18%] h-10 w-24 rounded-t-full bg-[#b5891f]" />
            <motion.div className="absolute left-3 top-[32%] h-4 w-18 w-[72px] rounded-full bg-[#ffe7a3]" animate={{ opacity: lamp ? 1 : 0.1, boxShadow: lamp ? '0 0 50px 22px rgba(252,163,17,.55)' : 'none' }} />
          </div>
          <div className="absolute left-[18%] top-[18%] h-16 w-28 rotate-[-6deg] rounded bg-cream shadow-lg" />
          <div className="absolute left-[30%] top-[30%] h-14 w-24 rotate-[8deg] rounded bg-[#f3e6c4] shadow-lg" />
          <div className="absolute left-[78%] top-[20%] h-12 w-12 rounded-full border-[6px] border-[#b5891f] bg-cream/30" />
          <div className="absolute left-[85%] top-[45%] h-3 w-14 rotate-45 rounded bg-[#5b3d24]" />
        </div>
      </SceneLayer>
      <div className="dust pointer-events-none absolute inset-0" aria-hidden>{Array.from({ length: 14 }, (_, k) => <span key={k} style={{ left: `${(k * 37) % 100}%`, top: `${(k * 53) % 70 + 10}%`, animationDelay: `${k * 0.7}s` }} />)}</div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,.55))]" />
      {children}
    </motion.div>
  );
}

export function CharacterSprite({ show, from = 'left', className = '', children }: { show: boolean; from?: 'left' | 'right' | 'bottom'; className?: string; children: ReactNode }) {
  const dur = useDur();
  const off = { left: { x: -160 }, right: { x: 160 }, bottom: { y: 160 } }[from];
  return (
    <AnimatePresence>
      {show && <motion.div className={className} initial={{ opacity: 0, ...off }} animate={{ opacity: 1, x: 0, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: dur(0.7), type: 'spring', bounce: 0.3 }}>{children}</motion.div>}
    </AnimatePresence>
  );
}

/** Typewriter that can be completed instantly by click; text stays real HTML for screen readers. */
export function Typewriter({ text, cps = 40 }: { text: string; cps?: number }) {
  const { s, motionOn } = useSettings();
  const chars = [...text];
  const [n, setN] = useState(motionOn ? 0 : chars.length);
  useEffect(() => { setN(motionOn ? 0 : chars.length); }, [text, motionOn]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (n >= chars.length) return;
    const t = setTimeout(() => setN((x) => x + 1), 1000 / (cps * s.speed));
    return () => clearTimeout(t);
  }, [n, chars.length, cps, s.speed]);
  return <span onClick={() => setN(chars.length)} aria-label={text}><span aria-hidden>{chars.slice(0, n).join('')}</span></span>;
}

export function DialogueBox({ speaker = 'โค้ดี้', text, avatar = <Cody talking />, className = '' }: { speaker?: string; text: string; avatar?: ReactNode; className?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`flex items-end gap-3 ${className}`} aria-live="polite">
      <div className="h-20 w-20 shrink-0 sm:h-24 sm:w-24">{avatar}</div>
      <div className="relative flex-1 rounded-2xl bg-cream p-4 text-navy shadow-xl ring-2 ring-gold">
        <div className="mb-1 text-sm font-bold text-teal">{speaker}</div>
        <p className="text-base leading-relaxed sm:text-lg"><Typewriter text={text} /></p>
      </div>
    </motion.div>
  );
}

export function EvidenceReveal({ open, title, children }: { open: boolean; title: string; children: ReactNode }) {
  const dur = useDur();
  return (
    <div className="relative mx-auto w-full max-w-md [perspective:900px]">
      <div className="relative h-40 rounded-lg bg-[#c9973f] shadow-2xl">
        <motion.div className="absolute inset-x-0 top-0 z-20 h-24 origin-top bg-[#e0b25a] [clip-path:polygon(0_0,100%_0,50%_100%)]"
          animate={{ rotateX: open ? 180 : 0 }} transition={{ duration: dur(0.6) }} />
        <div className="absolute left-1/2 top-16 z-30 h-8 w-8 -translate-x-1/2 rounded-full bg-alert" style={{ opacity: open ? 0 : 1 }} />
        <motion.div className="absolute inset-x-4 top-2 z-10 rounded bg-cream p-4 text-navy shadow-lg"
          initial={false} animate={{ y: open ? -130 : 0, zIndex: open ? 40 : 10 }} transition={{ duration: dur(0.7), delay: dur(0.5) }}>
          <div className="mb-1 font-bold text-teal">{title}</div>
          <div className="text-base">{children}</div>
        </motion.div>
      </div>
    </div>
  );
}

export function MagnifyingGlass({ run = true }: { run?: boolean }) {
  const dur = useDur();
  return (
    <motion.div aria-hidden className="pointer-events-none absolute z-30 h-24 w-24" initial={{ left: '-10%', top: '30%' }}
      animate={run ? { left: ['-10%', '40%', '75%', '45%'], top: ['30%', '10%', '40%', '25%'] } : {}} transition={{ duration: dur(2.2), ease: 'easeInOut' }}>
      <div className="h-20 w-20 rounded-full border-[7px] border-[#b5891f] bg-white/15 shadow-[0_0_25px_rgba(252,163,17,.6)] backdrop-brightness-150" />
      <div className="absolute bottom-0 right-0 h-3 w-12 origin-left rotate-45 rounded bg-[#5b3d24]" />
    </motion.div>
  );
}

export function CaseStamp({ show, text = 'คดีคลี่คลาย', color = '#16866A' }: { show: boolean; text?: string; color?: string }) {
  const { s } = useSettings();
  const dur = useDur();
  useEffect(() => { if (show) sfx('stamp', s.muted); }, [show]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ scale: 2.4, opacity: 0, rotate: -25 }} animate={{ scale: 1, opacity: 1, rotate: -12 }} transition={{ duration: dur(0.35), type: 'spring', bounce: 0.45 }}
          className="inline-block rounded-xl border-[6px] px-6 py-2 text-3xl font-black tracking-wide sm:text-5xl" style={{ borderColor: color, color }}>
          {text}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function AnimatedScore({ value, className = '' }: { value: number; className?: string }) {
  const dur = useDur();
  const mv = useMotionValue(0);
  const shown = useTransform(mv, (v) => Math.round(v).toLocaleString('th-TH'));
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const c = animate(mv, value, { duration: dur(1.2) });
    const un = shown.on('change', (v) => { if (ref.current) ref.current.textContent = v; });
    return () => { c.stop(); un(); };
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  return <span ref={ref} className={`font-num tabular-nums ${className}`} aria-label={`${value} คะแนน`}>{dur(1) ? 0 : value}</span>;
}
