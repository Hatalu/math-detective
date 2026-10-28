import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Dice5, Eraser, Expand, Hand, Highlighter, PanelRightClose, PanelRightOpen, Pencil, Timer, Trash2, Undo2 } from 'lucide-react';
import { Page } from '../components/ui';
import { Art } from '../components/art';
import { CalculationStepReveal, DataSortingAnimation } from '../components/mathviz';
import { calculateMean, calculateMedian, calculateModes, fmt, MEASURE_TH, parseDataText, type Measure } from '../lib/math';
import { useSettings } from '../lib/settings';
import { sfx } from '../lib/sound';

// Teacher board: client-only, nothing is saved or sent. Drawings live in memory per page.
type Tool = 'pointer' | 'pen' | 'hl' | 'eraser';
type Stroke = { tool: Tool | 'clear'; color: string; pts: [number, number, number][] };

const COLORS = ['#0B1B3F', '#C8323C', '#1F8A70'];
const PAGES: { title: string; aid?: ReactNode }[] = [
  { title: 'กระดานเปล่า' },
  { title: 'ค่ากลางของข้อมูลคืออะไร', aid: <p>ค่ากลาง คือ ค่าเดียวที่ใช้เป็นตัวแทนของข้อมูลทั้งชุด มี 3 แบบหลัก: <b>ค่าเฉลี่ยเลขคณิต</b> <b>มัธยฐาน</b> และ <b>ฐานนิยม</b></p> },
  { title: 'ค่าเฉลี่ยเลขคณิต', aid: <><p className="font-num text-lg font-bold">x̄ = ผลรวมของข้อมูลทั้งหมด ÷ จำนวนข้อมูล</p><p className="mt-1 text-sm">ใช้ข้อมูลทุกค่า จึงเปลี่ยนมากเมื่อมีค่าที่สูงหรือต่ำผิดปกติ</p></> },
  { title: 'มัธยฐาน', aid: <><p>เรียงข้อมูลจากน้อยไปมาก แล้วหาค่าที่อยู่ตรงกลาง</p><p className="mt-1 text-sm">n เป็นจำนวนคี่: ตำแหน่งที่ (n + 1) ÷ 2 · n เป็นจำนวนคู่: เฉลี่ยค่าตำแหน่งที่ n ÷ 2 และ n ÷ 2 + 1</p></> },
  { title: 'ฐานนิยม', aid: <><p>ค่าที่มีความถี่สูงสุด (ปรากฏบ่อยที่สุด)</p><p className="mt-1 text-sm">มีได้มากกว่า 1 ค่า และถ้าทุกค่ามีความถี่เท่ากัน ถือว่าไม่มีฐานนิยม</p></> },
  { title: 'เลือกค่ากลางให้เหมาะกับข้อมูล', aid: <ul className="list-disc space-y-1 pl-5 text-sm"><li>ข้อมูลไม่มีค่าผิดปกติ → ค่าเฉลี่ยเลขคณิต</li><li>มีค่าสูงหรือต่ำผิดปกติ → มัธยฐาน</li><li>อยากรู้ค่าที่พบบ่อยที่สุด / ข้อมูลเชิงคุณภาพ → ฐานนิยม</li></ul> },
];

export default function Teach() {
  const { s } = useSettings();
  const [page, setPage] = useState(0);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState(COLORS[1]);
  const [panel, setPanel] = useState(false);
  const [pop, setPop] = useState<'timer' | 'dice' | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const pages = useRef(new Map<number, Stroke[]>());
  const cur = useRef<Stroke | null>(null);
  const penSeen = useRef(false);
  const strokes = () => { if (!pages.current.has(page)) pages.current.set(page, []); return pages.current.get(page)!; };

  const redraw = useCallback(() => {
    const c = canvas.current, ctx = c?.getContext('2d'); if (!c || !ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    for (const st of pages.current.get(page) ?? []) {
      if (st.tool === 'clear') { ctx.clearRect(0, 0, c.width, c.height); continue; }
      ctx.save();
      ctx.lineCap = ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = st.tool === 'eraser' ? 'destination-out' : 'source-over';
      ctx.strokeStyle = st.tool === 'hl' ? '#F5C04A' : st.color;
      if (st.tool === 'pen') { // pressure-sensitive width per segment
        for (let i = 1; i < st.pts.length; i++) {
          const [x0, y0] = st.pts[i - 1], [x1, y1, p] = st.pts[i];
          ctx.lineWidth = 2 + p * 6; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        }
        if (st.pts.length === 1) { const [x, y, p] = st.pts[0]; ctx.fillStyle = st.color; ctx.beginPath(); ctx.arc(x, y, 1 + p * 3, 0, 7); ctx.fill(); }
      } else { // one path so the highlighter alpha does not stack into dark blobs
        ctx.globalAlpha = st.tool === 'hl' ? 0.4 : 1; ctx.lineWidth = st.tool === 'hl' ? 22 : 36;
        ctx.beginPath(); st.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
      }
      ctx.restore();
    }
  }, [page]);

  // canvas pixels follow its CSS size × devicePixelRatio; points stay in CSS px
  useEffect(() => {
    const c = canvas.current; if (!c) return;
    const fit = () => {
      const dpr = devicePixelRatio || 1;
      c.width = c.clientWidth * dpr; c.height = c.clientHeight * dpr;
      c.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0); redraw();
    };
    const ro = new ResizeObserver(fit); ro.observe(c); fit();
    return () => ro.disconnect();
  }, [redraw]);

  const at = (e: PointerEvent | React.PointerEvent): [number, number, number] => {
    const r = canvas.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top, e.pointerType === 'mouse' || !e.pressure ? 0.5 : e.pressure];
  };
  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    if (e.pointerType === 'pen') penSeen.current = true;
    else if (e.pointerType === 'touch' && penSeen.current) return; // palm rejection once a pencil is used
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
    cur.current = { tool, color, pts: [at(e)] }; strokes().push(cur.current); redraw();
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!cur.current) return;
    const evs = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
    for (const ev of evs.length ? evs : [e.nativeEvent]) cur.current.pts.push(at(ev));
    redraw();
  }
  const up = () => { cur.current = null; };
  const undo = () => { strokes().pop(); redraw(); };
  const clear = () => { strokes().push({ tool: 'clear', color: '', pts: [] }); redraw(); }; // undoable

  const go = (d: number) => { setPage((p) => Math.min(PAGES.length - 1, Math.max(0, p + d))); };
  useEffect(() => { redraw(); }, [page, redraw]);

  const canFull = typeof document !== 'undefined' && !!document.documentElement.requestFullscreen;
  const full = () => { if (document.fullscreenElement) document.exitFullscreen?.(); else document.documentElement.requestFullscreen?.().catch(() => {}); };

  const tb = (on: boolean) => `grid h-12 w-12 shrink-0 place-items-center rounded-xl transition sm:h-14 sm:w-14 ${on ? 'bg-gold ring-2 ring-navy' : 'bg-white/70 hover:bg-white'}`;
  const icon = (name: string, fb: ReactNode, cls = '') => <Art file={`ui-tool-${name}.webp`} className={`h-10 w-10 object-contain sm:h-11 sm:w-11 ${cls}`} fallback={fb} />;
  const aid = PAGES[page].aid;

  return (
    <Page full title="โหมดครูผู้สอน · กระดานค่ากลาง" back="/hq">
      <div className="relative flex h-full flex-col">
        <div className="relative min-h-0 flex-1">
          {/* small page title in the corner keeps the middle empty for teaching */}
          <div className="pointer-events-none absolute left-3 top-2 z-10 rounded-xl bg-navy/85 px-3 py-1 text-cream shadow">
            <span className="mr-2 font-num text-sm text-gold">{page + 1}/{PAGES.length}</span><b>{PAGES[page].title}</b>
          </div>
          <TimerBadge />

          <canvas ref={canvas} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onContextMenu={(e) => e.preventDefault()}
            aria-label="พื้นที่เขียนของครู" className={`absolute inset-0 z-[5] h-full w-full select-none [-webkit-touch-callout:none] [touch-action:none] ${tool === 'pointer' ? 'pointer-events-none' : 'cursor-crosshair'}`} />

          <AnimatePresence>
            {panel && (
              <motion.aside initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }}
                className="absolute bottom-2 right-2 top-12 z-[6] w-[min(420px,92vw)] overflow-y-auto overscroll-contain rounded-2xl bg-white/95 p-4 text-navy shadow-2xl ring-2 ring-navy/20">
                {aid && <div className="mb-4 rounded-xl bg-gold/20 p-3">{aid}</div>}
                <DataDemo />
              </motion.aside>
            )}
          </AnimatePresence>

          <AnimatePresence>{pop === 'dice' && <DicePop onClose={() => setPop(null)} muted={s.muted} />}</AnimatePresence>
          <AnimatePresence>{pop === 'timer' && <TimerPop onClose={() => setPop(null)} />}</AnimatePresence>
        </div>

        {/* toolbar */}
        <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto bg-navy/90 p-2 sm:justify-center sm:gap-2" role="toolbar" aria-label="เครื่องมือครู">
          <button className={tb(tool === 'pointer')} onClick={() => setTool('pointer')} aria-label="โหมดกดปุ่ม (ไม่เขียน)" aria-pressed={tool === 'pointer'}>{icon('pointer', <Hand />)}</button>
          <button className={tb(tool === 'pen')} onClick={() => setTool('pen')} aria-label="ปากกา" aria-pressed={tool === 'pen'}>{icon('pen', <Pencil />)}</button>
          <button className={tb(tool === 'hl')} onClick={() => setTool('hl')} aria-label="ปากกาเน้นข้อความ" aria-pressed={tool === 'hl'}>{icon('highlighter', <Highlighter />)}</button>
          <button className={tb(tool === 'eraser')} onClick={() => setTool('eraser')} aria-label="ยางลบ" aria-pressed={tool === 'eraser'}>{icon('eraser', <Eraser />)}</button>
          <div className="flex shrink-0 gap-1 rounded-xl bg-white/15 p-1">
            {COLORS.map((c) => (
              <button key={c} onClick={() => { setColor(c); setTool('pen'); }} aria-label={`สีปากกา ${c}`} aria-pressed={color === c}
                className={`h-10 w-10 rounded-full ring-2 sm:h-12 sm:w-12 ${color === c && tool === 'pen' ? 'ring-4 ring-gold' : 'ring-white/60'}`} style={{ background: c }} />
            ))}
          </div>
          <button className={tb(false)} onClick={undo} aria-label="เลิกทำ">{icon('undo', <Undo2 />, '-scale-x-100')}</button>
          <button className={tb(false)} onClick={clear} aria-label="ล้างกระดานหน้านี้">{icon('clear', <Trash2 />)}</button>
          <span className="mx-1 h-10 w-px shrink-0 bg-white/30" />
          <button className={tb(pop === 'timer')} onClick={() => setPop(pop === 'timer' ? null : 'timer')} aria-label="นาฬิกาจับเวลา">{icon('timer', <Timer />)}</button>
          <button className={tb(pop === 'dice')} onClick={() => setPop(pop === 'dice' ? null : 'dice')} aria-label="สุ่มเลขที่/ทีม">{icon('dice', <Dice5 />)}</button>
          <button className={tb(panel)} onClick={() => setPanel(!panel)} aria-label="แผงสื่อการสอน" aria-pressed={panel}>{panel ? <PanelRightClose /> : <PanelRightOpen />}</button>
          {canFull && <button className={tb(false)} onClick={full} aria-label="เต็มจอ">{icon('fullscreen', <Expand />)}</button>}
          <span className="mx-1 h-10 w-px shrink-0 bg-white/30" />
          <button className={tb(false)} onClick={() => go(-1)} disabled={page === 0} aria-label="หน้าก่อน"><ChevronLeft /></button>
          <button className={tb(false)} onClick={() => go(1)} disabled={page === PAGES.length - 1} aria-label="หน้าถัดไป"><ChevronRight /></button>
        </div>
      </div>
    </Page>
  );
}

/** Type a data set and show mean / median / mode with steps, all from lib/math. */
function DataDemo() {
  const [text, setText] = useState('15, 11, 18, 15, 20, 14, 17, 19, 15');
  const [m, setM] = useState<Measure>('mean');
  let data: number[] = [], err = '';
  try { data = parseDataText(text); } catch (e) { err = (e as Error).message; }
  const modes = data.length ? calculateModes(data) : [];
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block font-bold">ชุดข้อมูลตัวอย่าง (คั่นด้วยจุลภาค)</span>
        <textarea className="w-full rounded-lg border-2 border-navy/15 p-2 font-num text-lg focus:border-gold focus:outline-none" rows={2} value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      {err ? <p className="text-alert">{err}</p> : (
        <>
          <DataSortingAnimation data={data} highlightMiddle={m === 'median'} />
          <div className="grid grid-cols-3 gap-1">
            {(['mean', 'median', 'mode'] as Measure[]).map((k) => (
              <button key={k} onClick={() => setM(k)} className={`min-h-[44px] rounded-xl border-2 px-1 text-sm font-bold ${m === k ? 'border-gold bg-gold/25' : 'border-navy/15'}`}>
                <Art file={`ui-icon-${k}.webp`} className="mx-auto h-8 w-8 object-contain" />{MEASURE_TH[k]}
              </button>
            ))}
          </div>
          <p className="rounded-lg bg-navy/5 p-2 font-num">
            ค่าเฉลี่ย {fmt(calculateMean(data))} · มัธยฐาน {fmt(calculateMedian(data))} · ฐานนิยม {modes.length ? modes.map(fmt).join(', ') : 'ไม่มี'}
          </p>
          <CalculationStepReveal key={m + text} measure={m} data={data} />
        </>
      )}
    </div>
  );
}

// shared countdown state so the badge keeps running when the popover closes
let timerEnd = 0;
const timerSubs = new Set<() => void>();
const setTimerEnd = (t: number) => { timerEnd = t; timerSubs.forEach((f) => f()); };
function useTimer() {
  const [, bump] = useState(0);
  useEffect(() => { const f = () => bump((x) => x + 1); timerSubs.add(f); const i = setInterval(f, 500); return () => { timerSubs.delete(f); clearInterval(i); }; }, []);
  return timerEnd ? Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000)) : null;
}
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function TimerBadge() {
  const left = useTimer();
  const { s } = useSettings();
  const rang = useRef(false);
  useEffect(() => { if (left === 0 && !rang.current) { rang.current = true; sfx('correct', s.muted); } if (left) rang.current = false; }, [left, s.muted]);
  if (left === null) return null;
  return (
    <button onClick={() => setTimerEnd(0)} aria-label="หยุดนาฬิกา" className={`absolute right-3 top-2 z-10 rounded-2xl px-4 py-1 font-num text-3xl font-black shadow-lg sm:text-5xl ${left === 0 ? 'animate-pulse bg-alert text-white' : left <= 10 ? 'bg-gold text-navy' : 'bg-navy text-gold'}`}>
      {left === 0 ? 'หมดเวลา!' : mmss(left)}
    </button>
  );
}

function TimerPop({ onClose }: { onClose: () => void }) {
  return (
    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-2xl bg-white p-3 text-navy shadow-2xl ring-2 ring-gold">
      <p className="mb-2 text-center font-bold">จับเวลา</p>
      <div className="flex flex-wrap justify-center gap-2">
        {[1, 2, 3, 5, 10].map((m) => (
          <button key={m} onClick={() => { setTimerEnd(Date.now() + m * 60000); onClose(); }} className="min-h-[48px] min-w-[64px] rounded-xl bg-gold px-3 font-bold">{m} นาที</button>
        ))}
        <button onClick={() => { setTimerEnd(0); onClose(); }} className="min-h-[48px] rounded-xl bg-navy/10 px-3 font-bold">หยุด</button>
      </div>
    </motion.div>
  );
}

function DicePop({ onClose, muted }: { onClose: () => void; muted: boolean }) {
  const [max, setMax] = useState(30);
  const [n, setN] = useState<number | null>(null);
  const [spin, setSpin] = useState(false);
  const roll = () => {
    setSpin(true);
    let k = 0;
    const t = setInterval(() => { setN(1 + Math.floor(Math.random() * max)); if (++k > 12) { clearInterval(t); setSpin(false); sfx('reveal', muted); } }, 70);
  };
  return (
    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="absolute left-1/2 top-1/2 z-20 w-[min(360px,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-5 text-center text-navy shadow-2xl ring-4 ring-gold">
      <p className="font-bold">สุ่มเลขที่ / ทีม</p>
      <label className="mt-2 flex items-center justify-center gap-2">1 ถึง <input type="number" min={2} max={99} value={max} onChange={(e) => setMax(Math.max(2, Math.min(99, Number(e.target.value) || 2)))} className="w-20 rounded-lg border-2 border-navy/20 p-1 text-center font-num text-xl" /></label>
      <motion.div key={n ?? 0} initial={{ scale: spin ? 1 : 0.5 }} animate={{ scale: 1 }} className="my-4 font-num text-8xl font-black text-alert">{n ?? '?'}</motion.div>
      <div className="flex justify-center gap-2">
        <button onClick={roll} disabled={spin} className="min-h-[52px] rounded-xl bg-gold px-6 text-lg font-bold">สุ่ม!</button>
        <button onClick={onClose} className="min-h-[52px] rounded-xl bg-navy/10 px-4 font-bold">ปิด</button>
      </div>
    </motion.div>
  );
}
