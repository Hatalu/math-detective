import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, FileText, Image, Lightbulb, Lock, NotebookPen, Receipt, Send, Timer } from 'lucide-react';
import type { Evidence, QuestionContent } from '../lib/cases';
import { MEASURE_TH, type Measure, type StudentAnswer } from '../lib/math';
import { useSettings } from '../lib/settings';
import { sfx } from '../lib/sound';
import { Btn, Card, ErrorBox, inputCls } from './ui';
import { DataSortingAnimation } from './mathviz';
import { Art } from './art';
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

export function Investigation({ q, draftKey, hints, onRevealHint, onSubmit, locked, lockMsg, deadline, score, progressLabel }: {
  q: QuestionContent; draftKey: string; hints: HintState;
  onRevealHint: (level: number) => Promise<void>;
  onSubmit: (a: StudentAnswer, reasoning: string) => Promise<void>;
  locked: boolean; lockMsg?: string; deadline?: number | null; score?: number; progressLabel?: string;
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
  const step = locked ? 4 : measure && (valueText || noMode) ? 3 : inspected.length ? 2 : 1;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      {/* status strip: never covers the question */}
      <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
        <span className="rounded-md bg-navy px-3 py-1 font-num font-bold tracking-wider text-gold">{q.code}</span>
        <ol className="flex flex-1 flex-wrap gap-1 text-sm" aria-label="ความคืบหน้า">
          {['อ่านคดี', 'ตรวจหลักฐาน', 'วิเคราะห์', 'ส่งรายงาน'].map((t, k) => (
            <li key={t} className={`rounded-full px-3 py-1 ${k < step ? 'bg-teal text-white' : 'bg-navy/10'}`} aria-current={k === step - 1}>{k + 1}. {t}</li>
          ))}
        </ol>
        {progressLabel && <span className="text-sm opacity-70">{progressLabel}</span>}
        {remaining !== null && <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-num font-bold ${remaining < 60 ? 'bg-alert/15 text-alert' : 'bg-navy/10'}`}><Art file="ui-timer.webp" className="h-5 w-5 object-contain" fallback={<Timer size={16} aria-hidden />} /> {fmtTime(remaining)}</span>}
        {score !== undefined && <span className="rounded-full bg-gold/25 px-3 py-1 font-bold">คะแนนทีม {score}</span>}
      </div>

      <div className="space-y-4">
        <Card className="bg-gradient-to-br from-navy to-dblue !text-cream">
          <h2 className="text-2xl font-bold text-gold">{q.title}</h2>
          <p className="mt-2 leading-relaxed">{q.story}</p>
          <p className="mt-3 rounded-lg bg-white/10 p-3"><b className="text-gold">ภารกิจ:</b> {q.objective}</p>
        </Card>

        <Card>
          <h3 className="mb-3 text-lg font-bold">หลักฐานในแฟ้มคดี</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {q.evidence.map((ev, k) => {
              const Icon = ICON[ev.kind];
              return (
                <button key={k} onClick={() => { setOpen(k); if (!inspected.includes(k)) setInspected([...inspected, k]); }}
                  className={`relative min-h-[110px] border border-navy/15 p-3 text-left shadow-md transition hover:-translate-y-1 hover:shadow-xl focus-visible:outline focus-visible:outline-4 focus-visible:outline-gold ${PAPER[ev.kind]}`}>
                  <Art file={`item-${ev.kind}.webp`} className="mb-1 h-12 w-12 object-contain" fallback={<Icon className="mb-1 text-dblue" aria-hidden />} />
                  <div className="font-semibold leading-tight">{ev.title}</div>
                  <div className="mt-1 text-xs opacity-60">{inspected.includes(k) ? '✓ ตรวจแล้ว' : 'แตะเพื่อตรวจสอบ'}</div>
                </button>
              );
            })}
          </div>
        </Card>

        <Card>
          <h3 className="mb-1 text-lg font-bold">ชุดข้อมูล: {q.dataLabel} ({q.unit})</h3>
          <p className="mb-3 text-sm opacity-70">จำนวน {q.data.length} ค่า</p>
          <DataSortingAnimation data={q.data} marked={marked} onToggle={(i) => setMarked(marked.includes(i) ? marked.filter((x) => x !== i) : [...marked, i])} />
          <label className="mt-4 block">
            <span className="mb-1 block text-sm font-semibold">บันทึกการสืบสวนของทีม</span>
            <textarea className={inputCls} rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น มีค่าหนึ่งสูงผิดปกติ…" disabled={locked} />
          </label>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <h3 className="mb-2 flex items-center gap-2 text-lg font-bold"><Lightbulb className="text-gold" aria-hidden /> คำใบ้ ({hints.levels.length}/3)</h3>
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
        </Card>

        <motion.div key={shake} animate={shake ? { x: [0, -8, 8, -5, 5, 0] } : {}} transition={{ duration: 0.35 }}>
          <Card>
            <h3 className="mb-2 text-lg font-bold">คำถาม</h3>
            <p className="mb-4 text-lg font-medium">{q.prompt}</p>
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
          </Card>
        </motion.div>
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
