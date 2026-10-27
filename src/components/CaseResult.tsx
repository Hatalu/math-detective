import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { MEASURE_TH, fmt, type Measure } from '../lib/math';
import { useDur, useSettings } from '../lib/settings';
import { sfx } from '../lib/sound';
import { AnimatedScore, CaseStamp, CinematicSequence, DialogueBox, EvidenceReveal } from './cinema';
import { Order } from './characters';
import { CalculationStepReveal } from './mathviz';
import { Card } from './ui';

export interface Feedback {
  correct: boolean;
  scores: { accuracy: number; method: number; reasoning: number; communication: number; speed: number; penalty: number; total: number };
  measure: Measure; values: number[]; noMode: boolean;
  reasoning: string; misconceptions: string; limitations: string;
}

const answerText = (f: Pick<Feedback, 'values' | 'noMode'>, unit: string) => (f.noMode ? 'ไม่มีฐานนิยม' : `${f.values.map(fmt).join(' และ ')} ${unit}`);

/** Solving-the-case cutscene (correct) or gentle retry cutscene (incorrect). */
export function ResultCutscene({ fb, unit, onDone }: { fb: Feedback; unit: string; onDone: () => void }) {
  const { s } = useSettings();
  const dur = useDur();
  useEffect(() => { sfx(fb.correct ? 'correct' : 'wrong', s.muted); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const steps = fb.correct
    ? [{ id: 'glow', ms: 600 }, { id: 'connect', ms: 1400 }, { id: 'stamp', ms: 900 }, { id: 'score' }]
    : [{ id: 'shake', ms: 600 }, { id: 'owl' }];
  return (
    <CinematicSequence steps={steps} onDone={onDone} video={fb.correct ? 'cut-correct.mp4' : 'cut-wrong.mp4'}>
      {(q) => fb.correct ? (
        <div className="relative flex w-full max-w-2xl flex-col items-center gap-6 text-center">
          <motion.div className="absolute -inset-10 -z-10 rounded-full bg-gold/30 blur-3xl" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.5] }} transition={{ duration: dur(1.2) }} />
          <svg viewBox="0 0 300 120" className="w-full max-w-md" aria-hidden>
            {[[40, 30], [150, 90], [260, 30]].map(([x, y], k) => <rect key={k} x={x - 30} y={y - 18} width="60" height="36" rx="4" fill="#FFF8E8" />)}
            {q.at('connect') && [[40, 30, 150, 90], [150, 90, 260, 30]].map(([a, b, c, d], k) => (
              <motion.line key={k} x1={a} y1={b} x2={c} y2={d} stroke="#FCA311" strokeWidth="4" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: dur(0.6), delay: dur(k * 0.4) }} />
            ))}
          </svg>
          <p className="text-xl">หลักฐานเชื่อมโยงกันแล้ว: <b className="text-gold">{MEASURE_TH[fb.measure]} = {answerText(fb, unit)}</b></p>
          <CaseStamp show={q.at('stamp')} />
          {q.at('score') && <p className="text-2xl">คะแนนภารกิจ <AnimatedScore value={fb.scores.total} className="text-5xl font-black text-gold" /></p>}
        </div>
      ) : (
        <div className="w-full max-w-xl space-y-6">
          <motion.div animate={{ x: [0, -10, 10, -6, 6, 0] }} transition={{ duration: dur(0.4) }} className="rounded-2xl bg-white/10 p-6 text-center text-2xl font-bold">
            หลักฐานยังเชื่อมกันไม่ครบ
          </motion.div>
          {q.at('owl') && <DialogueBox text="ไม่เป็นไรนะ นักสืบทุกคนต้องตรวจซ้ำ ลองดูขั้นตอนการคำนวณและเหตุผลด้านล่าง แล้วจดว่าพลาดตรงไหน" />}
        </div>
      )}
    </CinematicSequence>
  );
}

export function CaseReport({ fb, data, unit }: { fb: Feedback; data: number[]; unit: string }) {
  const rows: [string, number, number][] = [
    ['ความถูกต้องของคำตอบ', fb.scores.accuracy, 50], ['วิธีคำนวณและการตรวจหลักฐาน', fb.scores.method, 20],
    ['เหตุผลในการเลือกค่ากลาง', fb.scores.reasoning, 25], ['การสื่อสารในทีม (ครูให้)', fb.scores.communication, 5],
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <h3 className="mb-2 text-lg font-bold">รายงานผลคดี</h3>
        <p className="mb-3">คำตอบที่ถูกต้อง: <b>{MEASURE_TH[fb.measure]} = {answerText(fb, unit)}</b></p>
        <table className="w-full text-left"><tbody>
          {rows.map(([t, v, m]) => <tr key={t} className="border-b border-navy/10"><td className="py-2">{t}</td><td className="text-right font-num font-bold">{v}/{m}</td></tr>)}
          {fb.scores.speed > 0 && <tr><td className="py-2">โบนัสเวลา</td><td className="text-right font-num">+{fb.scores.speed}</td></tr>}
          {fb.scores.penalty > 0 && <tr><td className="py-2">ใช้คำใบ้</td><td className="text-right font-num text-alert">−{fb.scores.penalty}</td></tr>}
          <tr><td className="py-2 font-bold">รวม</td><td className="text-right font-num text-xl font-black">{fb.scores.total}</td></tr>
        </tbody></table>
        <p className="mt-2 text-xs opacity-60">คะแนนเหตุผลเป็นคะแนนเบื้องต้นจากระบบ ครูปรับได้หลังอ่านเหตุผลของทีม</p>
      </Card>
      <Card>
        <h3 className="mb-2 text-lg font-bold">ขั้นตอนการคำนวณ</h3>
        <CalculationStepReveal measure={fb.measure} data={data} />
      </Card>
      <Card className="lg:col-span-2">
        <h3 className="mb-1 font-bold text-teal">ทำไมจึงเลือก{MEASURE_TH[fb.measure]}</h3><p className="mb-3">{fb.reasoning}</p>
        <h3 className="mb-1 font-bold text-alert">ข้อผิดพลาดที่พบบ่อย</h3><p className="mb-3">{fb.misconceptions}</p>
        <h3 className="mb-1 font-bold text-dblue">ข้อจำกัดของค่ากลางนี้</h3><p>{fb.limitations}</p>
      </Card>
    </div>
  );
}

/** New-case cutscene: envelope opens, archivist briefs the team. */
const CASE_VIDEO: Record<string, string> = { case03: 'cut-outlier.mp4', case08: 'cut-final-boss.mp4' };

export function CaseOpenCutscene({ code, title, objective, onDone }: { code: string; title: string; objective: string; onDone: () => void }) {
  const id = code.toLowerCase().replace(/\s+/g, ''); // 'CASE 03' → 'case03'
  return (
    <CinematicSequence steps={[{ id: 'env', ms: 700 }, { id: 'open', ms: 1600 }, { id: 'brief' }]} onDone={onDone} bg={`${id}-bg.webp`} video={CASE_VIDEO[id] ?? 'cut-case-open.mp4'}>
      {(q) => (
        <div className="w-full max-w-xl space-y-24 sm:space-y-28">
          <EvidenceReveal open={q.at('open')} title={code}><b className="text-xl">{title}</b></EvidenceReveal>
          {q.at('brief') && <DialogueBox speaker="คุณออร์เดอร์" avatar={<Order />} text={objective} />}
        </div>
      )}
    </CinematicSequence>
  );
}

/** Final case summary cutscene. */
export function FinalCutscene({ total, solved, count, onDone }: { total: number; solved: number; count: number; onDone: () => void }) {
  return (
    <CinematicSequence steps={[{ id: 'wall', ms: 1500 }, { id: 'stamp', ms: 900 }, { id: 'talk' }]} onDone={onDone} bg="final-bg.webp" video="cut-ending.mp4">
      {(q) => (
        <div className="flex w-full max-w-2xl flex-col items-center gap-6 text-center">
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: count }, (_, k) => (
              <motion.div key={k} initial={{ opacity: 0, rotate: k % 2 ? 8 : -8, y: -40 }} animate={{ opacity: 1, rotate: k % 2 ? 3 : -3, y: 0 }} transition={{ delay: k * 0.12 }}
                className={`grid h-14 w-16 place-items-center rounded font-num font-bold ${k < solved ? 'bg-cream text-navy' : 'bg-white/20'}`}>{String(k + 1).padStart(2, '0')}</motion.div>
            ))}
          </div>
          <CaseStamp show={q.at('stamp')} text="ปิดแฟ้มคดีใหญ่" color="#FCA311" />
          {q.at('talk') && <>
            <p className="text-2xl">คลี่คลาย {solved}/{count} คดี · คะแนนรวม <AnimatedScore value={total} className="font-black text-gold" /></p>
            <DialogueBox text="เข็มทิศค่ากลางกลับมาแล้ว! จำไว้นะ: ค่ากลางที่ดีที่สุดขึ้นกับคำถามและลักษณะข้อมูลเสมอ" />
          </>}
        </div>
      )}
    </CinematicSequence>
  );
}
