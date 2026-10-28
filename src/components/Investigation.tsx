import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, BarChart3, CheckCircle2, ClipboardCheck, FileText, Image, Lightbulb, Lock, NotebookPen, Receipt, Search, Send, Timer } from 'lucide-react';
import type { Evidence, QuestionContent } from '../lib/cases';
import { MEASURE_TH, type Measure, type StudentAnswer } from '../lib/math';
import { useSettings } from '../lib/settings';
import { sfx } from '../lib/sound';
import { Btn, ErrorBox, inputCls } from './ui';
import { DataSortingAnimation } from './mathviz';
import { Art } from './art';
import { SceneHunt } from './SceneHunt';
import { CinematicSequence, DialogueBox, EvidenceReveal, MagnifyingGlass } from './cinema';

export interface HintState { levels: { level: number; body: string }[]; enabled: boolean; penalty: number }

const ICON = { document: FileText, photo: Image, slip: Receipt, note: NotebookPen };
const PAPER: Record<Evidence['kind'], string> = {
  document: 'bg-[#f6ecd2] rotate-[-1deg]', photo: 'bg-white p-2 pb-6 rotate-[1.5deg]', slip: 'bg-[#fffbe6] rotate-[2deg] border-dashed', note: 'bg-[#fff3a8] rotate-[-2deg]',
};

/** Draft kept per question in sessionStorage so a route change does not lose the team's work. */
function useDraft<T>(key: string, init: T) {
  const [v, setV] = useState<T>(() => { try { return JSON.parse(sessionStorage.getItem(key) ?? 'null') ?? init; } catch { return init; } });
  useEffect(() => { try { sessionStorage.setItem(key, JSON.stringify(v)); } catch { /* storage unavailable: draft just isn't kept */ } }, [key, v]);
  return [v, setV] as const;
}

type Tab = 'case' | 'data' | 'answer' | 'hint' | 'result';

/** Fills its parent (Page full). hunt=false skips the find-the-data phase (teacher preview). children = result panel after submit. */
export function Investigation({ q, draftKey, hints, onRevealHint, onSubmit, locked, lockMsg, deadline, score, progressLabel, hunt = true, children }: {
  q: QuestionContent; draftKey: string; hints: HintState;
  onRevealHint: (level: number) => Promise<void>;
  onSubmit: (a: StudentAnswer, reasoning: string) => Promise<void>;
  locked: boolean; lockMsg?: string; deadline?: number | null; score?: number; progressLabel?: string; hunt?: boolean; children?: ReactNode;
}) {
  const { s } = useSettings();
  const [inspected, setInspected] = useDraft<number[]>(draftKey + ':seen', []);
  const [marked, setMarked] = useDraft<number[]>(draftKey + ':marked', []);
  const [note, setNote] = useDraft(draftKey + ':note', '');
  const [measure, setMeasure] = useDraft<Measure | null>(draftKey + ':measure', q.target === 'choose' ? null : q.target);
  const [valueText, setValueText] = useDraft(draftKey + ':value', '');
  const [noMode, setNoMode] = useDraft(draftKey + ':nomode', false);
  const [reasoning, setReasoning] = useDraft(draftKey + ':reason', '');
  const [open, setOpen] = useState<number | null>(null);
  const [clueScene, setClueScene] = useState<{ level: number; body: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [shake, setShake] = useState(0);

  const nextLevel = hints.levels.length + 1;
  const canHint = hints.enabled && nextLevel <= 3 && inspected.length > 0 && !locked;

  async function revealHint() {
    setErr(''); setBusy(true);
    try { await onRevealHint(nextLevel); sfx('reveal', s.muted); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  // play the clue cutscene when a new level arrives (also when teacher reveals to everyone)
  const [seenLevels, setSeenLevels] = useDraft(draftKey + ':cluesSeen', 0);
  useEffect(() => {
    const top = hints.levels[hints.levels.length - 1];
    if (top && top.level > seenLevels) { setClueScene(top); setSeenLevels(top.level); }
  }, [hints.levels]); // eslint-disable-line react-hooks/exhaustive-deps

  function parseValues(): number[] | string {
    if (!q.askValue) return [];
    if (measure === 'mode' && noMode) return [];
    const parts = valueText.split(/[\s,]+|และ/).filter(Boolean).map(Number);
    if (!parts.length || parts.some((x) => !Number.isFinite(x))) return 'กรุณากรอกคำตอบเป็นตัวเลข (ถ้ามีหลายค่าให้คั่นด้วยจุลภาค)';
    return parts;
  }

  async function submit() {
    setErr('');
    if (!measure) { setErr('เลือกค่ากลางที่ใช้ก่อนส่งคำตอบ'); setShake((x) => x + 1); return; }
    const vals = parseValues();
    if (typeof vals === 'string') { setErr(vals); setShake((x) => x + 1); return; }
    if (!confirm) { setConfirm(true); return; }
    setBusy(true);
    try {
      await onSubmit({ measure, values: vals, noMode: measure === 'mode' && noMode, markedEvidence: marked.length + inspected.length }, [reasoning, note && `บันทึก: ${note}`].filter(Boolean).join('\n'));
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); setConfirm(false); }
  }

  const remaining = useCountdown(deadline ?? null);
  const [hunted, setHunted] = useDraft(draftKey + ':hunted', !hunt);
  const [tab, setTab] = useState<Tab>(children ? 'result' : 'case');
  useEffect(() => { if (children) setTab('result'); }, [!!children]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!hunted && !locked) return <SceneHunt q={q} draftKey={draftKey} onDone={() => setHunted(true)} />;

  const done: Partial<Record<Tab, boolean>> = { case: inspected.length > 0, data: marked.length > 0, answer: locked };
  const tabs: { id: Tab; label: string; icon: typeof Search }[] = [
    { id: 'case', label: '1 หลักฐาน', icon: Search },
    { id: 'data', label: '2 ข้อมูล', icon: BarChart3 },
    { id: 'answer', label: '3 ตอบ', icon: Send },
    { id: 'hint', label: `คำใบ้ ${hints.levels.length}/3`, icon: Lightbulb },
    ...(children ? [{ id: 'result' as Tab, label: 'ผลคดี', icon: ClipboardCheck }] : []),
  ];
  const left = tab === 'answer' ? 'case' : tab; // wide screens keep the answer form open on the right
  const panel = 'min-h-0 overflow-y-auto overscroll-contain rounded-2xl bg-white/90 p-3 text-navy shadow-lg ring-1 ring-navy/10 sm:p-4';

  return (
    <div className="flex h-full flex-col gap-2 p-2 sm:gap-3 sm:p-3">
      {/* status strip */}
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <span className="rounded-md bg-navy px-3 py-1 font-num font-bold tracking-wider text-gold">{q.code}</span>
        <b className="min-w-0 flex-1 truncate">{q.title}</b>
        {progressLabel && <span className="text-sm opacity-70">{progressLabel}</span>}
        {remaining !== null && <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-num font-bold ${remaining < 60 ? 'bg-alert/15 text-alert' : 'bg-navy/10'}`}><Art file="ui-timer.webp" className="h-5 w-5 object-contain" fallback={<Timer size={16} aria-hidden />} /> {fmtTime(remaining)}</span>}
        {score !== undefined && <span className="rounded-full bg-gold/30 px-3 py-1 text-sm font-bold">คะแนน {score}</span>}
      </div>

      {/* the question stays pinned */}
      <div className="shrink-0 rounded-2xl bg-navy px-4 py-2 text-cream shadow-lg ring-2 ring-gold/50">
        <span className="mr-2 rounded bg-gold px-2 text-sm font-bold text-navy">คำถาม</span>
        <span className="font-semibold sm:text-lg">{q.prompt}</span>
      </div>

      <nav className="grid shrink-0 auto-cols-fr grid-flow-col gap-1.5" role="tablist" aria-label="ขั้นตอนการสืบสวน">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={`inline-flex min-h-[44px] items-center justify-center gap-1 whitespace-nowrap rounded-xl px-1 text-[13px] font-bold shadow transition sm:text-base ${id === 'answer' ? 'lg:hidden' : ''}
            ${tab === id || (id === left && tab === 'answer') ? 'bg-gold text-navy ring-2 ring-navy' : 'bg-white/80 text-navy hover:bg-white'}`}>
            <Icon size={18} className="hidden sm:inline" aria-hidden /> {label} {done[id] && <CheckCircle2 size={14} className="shrink-0 text-teal" aria-label="ทำแล้ว" />}
          </button>
        ))}
      </nav>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[1.15fr_1fr]">
        <section className={`${panel} ${tab === 'answer' ? 'hidden lg:block' : ''}`} role="tabpanel">
          {left === 'case' && (
            <>
              <p className="leading-relaxed">{q.story}</p>
              <p className="mt-2 rounded-lg bg-gold/20 p-2"><b>ภารกิจ:</b> {q.objective}</p>
              <h3 className="mb-2 mt-3 font-bold">หลักฐานในแฟ้มคดี <span className="text-sm font-normal opacity-70">(แตะเพื่อเปิดอ่าน)</span></h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {q.evidence.map((ev, k) => {
                  const Icon = ICON[ev.kind];
                  return (
                    <button key={k} onClick={() => { setOpen(k); if (!inspected.includes(k)) setInspected([...inspected, k]); }}
                      className={`relative min-h-[100px] border border-navy/15 p-3 text-left shadow-md transition hover:-translate-y-1 hover:shadow-xl focus-visible:outline focus-visible:outline-4 focus-visible:outline-gold ${PAPER[ev.kind]}`}>
                      <Art file={`item-${ev.kind}.webp`} className="mb-1 h-10 w-10 object-contain" fallback={<Icon className="mb-1 text-dblue" aria-hidden />} />
                      <div className="font-semibold leading-tight">{ev.title}</div>
                      <div className="mt-1 text-xs opacity-60">{inspected.includes(k) ? '✓ ตรวจแล้ว' : 'แตะเพื่อตรวจสอบ'}</div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {left === 'data' && (
            <>
              <h3 className="mb-1 font-bold">ข้อมูลที่ทีมหาเจอ: {q.dataLabel} ({q.unit})</h3>
              <p className="mb-3 text-sm opacity-70">จำนวน {q.data.length} ค่า · แตะตัวเลขเพื่อทำเครื่องหมาย และลองกด “เรียงจากน้อยไปมาก”</p>
              <DataSortingAnimation data={q.data} marked={marked} onToggle={(i) => setMarked(marked.includes(i) ? marked.filter((x) => x !== i) : [...marked, i])} />
              <label className="mt-4 block">
                <span className="mb-1 block text-sm font-semibold">บันทึกการสืบสวนของทีม</span>
                <textarea className={inputCls} rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น มีค่าหนึ่งสูงผิดปกติ…" disabled={locked} />
              </label>
            </>
          )}
          {left === 'hint' && (
            <>
              <h3 className="mb-2 flex items-center gap-2 font-bold"><Lightbulb className="text-gold" aria-hidden /> คำใบ้ ({hints.levels.length}/3)</h3>
              <ol className="space-y-2">
                {hints.levels.map((h) => (
                  <li key={h.level} className="rounded-lg bg-gold/15 p-3"><b className="text-teal">ระดับ {h.level} — {['สังเกตหลักฐาน', 'เชื่อมโยงข้อมูล', 'แนวทางแก้'][h.level - 1]}:</b> {h.body}</li>
                ))}
              </ol>
              {nextLevel <= 3 && (
                <div className="mt-3">
                  <Btn variant="navy" disabled={!canHint || busy} onClick={revealHint}>
                    <Lightbulb size={18} aria-hidden /> เปิดคำใบ้ระดับ {nextLevel}{hints.penalty > 0 ? ` (−${hints.penalty} คะแนน)` : ''}
                  </Btn>
                  <p className="mt-1 text-sm opacity-70">
                    {!hints.enabled ? 'ครูปิดคำใบ้อยู่' : inspected.length === 0 ? 'ตรวจหลักฐานอย่างน้อย 1 ชิ้นก่อนเปิดคำใบ้' : 'คำใบ้จะเปิดทีละระดับ และไม่บอกคำตอบทั้งหมด'}
                  </p>
                </div>
              )}
            </>
          )}
          {left === 'result' && children}
        </section>

        <motion.section key={shake} animate={shake ? { x: [0, -8, 8, -5, 5, 0] } : {}} transition={{ duration: 0.35 }}
          className={`${panel} ${tab === 'answer' ? '' : 'hidden lg:block'}`} role="tabpanel" aria-label="ตอบคดี">
            <fieldset disabled={locked || busy} className="space-y-4">
              <div role="radiogroup" aria-label="เลือกค่ากลาง" className="grid gap-2 sm:grid-cols-3">
                {(['mean', 'median', 'mode'] as Measure[]).map((m) => (
                  <button key={m} type="button" role="radio" aria-checked={measure === m}
                    disabled={q.target !== 'choose' && q.target !== m}
                    onClick={() => setMeasure(m)}
                    className={`min-h-[48px] rounded-xl border-2 px-3 font-semibold disabled:opacity-30 ${measure === m ? 'border-gold bg-gold/20' : 'border-navy/15'}`}>
                    <span className="inline-flex items-center justify-center gap-2"><Art file={`ui-icon-${m}.webp`} className="h-7 w-7 object-contain" />{MEASURE_TH[m]}</span>
                  </button>
                ))}
              </div>
              {q.askValue && (
                <div>
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold">คำตอบ ({q.unit}) {measure === 'mode' && '— ถ้ามีหลายค่าให้คั่นด้วยจุลภาค'}</span>
                    <input inputMode="decimal" className={`${inputCls} font-num text-xl`} value={valueText} disabled={noMode && measure === 'mode'}
                      onChange={(e) => setValueText(e.target.value)} placeholder="เช่น 15.5" />
                  </label>
                  {measure === 'mode' && (
                    <label className="mt-2 flex min-h-[44px] items-center gap-2"><input type="checkbox" className="h-5 w-5" checked={noMode} onChange={(e) => setNoMode(e.target.checked)} /> ไม่มีฐานนิยม</label>
                  )}
                  <p className="mt-1 text-xs opacity-60">ถ้าคำตอบเป็นทศนิยม ให้ปัดเป็นทศนิยม 2 ตำแหน่ง</p>
                </div>
              )}
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">เหตุผลของทีม: ทำไมจึงเลือกค่ากลางนี้</span>
                <textarea className={inputCls} rows={4} value={reasoning} onChange={(e) => setReasoning(e.target.value)} placeholder="อธิบายจากลักษณะข้อมูลและสิ่งที่คำถามต้องการ…" />
                <span className="text-xs opacity-60">{[...reasoning.trim()].length} ตัวอักษร</span>
              </label>
            </fieldset>
            {err && <div className="mt-3"><ErrorBox msg={err} /></div>}
            {locked ? (
              <p className="mt-4 flex items-center gap-2 rounded-lg bg-navy/10 p-3 font-semibold"><Lock size={18} aria-hidden /> {lockMsg ?? 'ปิดรับคำตอบแล้ว'}</p>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                <Btn onClick={submit} disabled={busy}><Send size={18} aria-hidden /> {busy ? 'กำลังส่ง…' : confirm ? 'ยืนยันส่งรายงาน (ส่งได้ครั้งเดียว)' : 'ส่งรายงานคดี'}</Btn>
                {confirm && <Btn variant="ghost" onClick={() => setConfirm(false)}>แก้ไขก่อน</Btn>}
              </div>
            )}
        </motion.section>
      </div>

      {/* evidence inspection panel */}
      <AnimatePresence>
        {open !== null && (
          <motion.div className="fixed inset-0 z-50 grid place-items-center bg-navy/80 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label={q.evidence[open].title}>
            <motion.div initial={{ scale: 0.8, rotate: -3 }} animate={{ scale: 1, rotate: 0 }} className={`w-full max-w-lg border border-navy/20 p-6 text-navy shadow-2xl ${PAPER[q.evidence[open].kind]} !rotate-0`}>
              <button autoFocus onClick={() => setOpen(null)} className="mb-3 inline-flex min-h-[44px] items-center gap-1 font-semibold text-dblue"><ArrowLeft aria-hidden /> กลับไปแฟ้มคดี</button>
              <h3 className="text-xl font-bold">{q.evidence[open].title}</h3>
              <p className="mt-3 text-lg leading-relaxed">{q.evidence[open].body}</p>
              {open === 0 && <p className="mt-4 font-num text-xl font-bold tracking-wide">{q.data.join(', ')}</p>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* clue discovery cutscene */}
      <AnimatePresence>
        {clueScene && (
          <CinematicSequence steps={[{ id: 'dim', ms: 300 }, { id: 'glass', ms: 1800 }, { id: 'open', ms: 1200 }, { id: 'talk' }]} onDone={() => setClueScene(null)} video="cut-hint.mp4">
            {(sq) => (
              <div className="relative w-full max-w-xl space-y-6">
                {!sq.at('open') && <MagnifyingGlass />}
                <EvidenceReveal open={sq.at('open')} title={`คำใบ้ระดับ ${clueScene.level}`}>{sq.at('open') ? clueScene.body : '…'}</EvidenceReveal>
                {sq.at('talk') && <DialogueBox text={['ลองสังเกตให้ดีนะ!', 'เริ่มเห็นความเชื่อมโยงแล้วใช่ไหม', 'ใกล้คลี่คลายแล้ว คิดต่ออีกนิดเดียว!'][clueScene.level - 1]} className="pt-8" />}
              </div>
            )}
          </CinematicSequence>
        )}
      </AnimatePresence>
    </div>
  );
}

export function useCountdown(deadline: number | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { if (!deadline) return; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, [deadline]);
  return deadline ? Math.max(0, Math.round((deadline - now) / 1000)) : null;
}
export const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
