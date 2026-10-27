import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { Btn, Card, Page } from '../components/ui';
import { Investigation, type HintState } from '../components/Investigation';
import { CaseOpenCutscene, CaseReport, FinalCutscene, ResultCutscene, type Feedback } from '../components/CaseResult';
import { DEFAULT_CASES, answerKey } from '../lib/cases';
import { calculateScore, evaluateAnswer, fillTemplate } from '../lib/math';

// Practice mode: single device, nothing sent to a server. Results live in sessionStorage only.
const KEY = 'md-practice';
type Saved = Record<number, Feedback>;
const load = (): Saved => { try { return JSON.parse(sessionStorage.getItem(KEY) ?? '{}'); } catch { return {}; } };
const PENALTY = 5;

export default function Practice() {
  const { idx } = useParams();
  const nav = useNavigate();
  const [saved, setSaved] = useState<Saved>(load);
  const i = idx === undefined ? -1 : Number(idx);
  const q = DEFAULT_CASES[i];
  const [hintLevel, setHintLevel] = useState(0);
  const [scene, setScene] = useState<'open' | 'result' | 'final' | null>('open');
  const total = Object.values(saved).reduce((s, f) => s + f.scores.total, 0);

  if (!q) {
    return (
      <Page title="โหมดฝึกสืบสวน — คลังคดี" back="/hq">
        <p className="mb-4">ฝึกบนเครื่องนี้ได้ทันที ไม่บันทึกลงเซิร์ฟเวอร์ · คะแนนรวม <b>{total}</b></p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {DEFAULT_CASES.map((c, k) => (
            <Link key={c.code} to={`/practice/${k}`} onClick={() => setScene('open')}
              className="group relative min-h-[150px] rotate-[-.5deg] rounded-lg bg-[#e8c98a] p-4 text-navy shadow-md transition hover:-translate-y-1 hover:rotate-0 hover:shadow-xl">
              <div className="absolute -top-3 left-4 rounded-t-md bg-[#d9b66b] px-3 py-0.5 font-num text-sm font-bold">{c.code}</div>
              <div className="mt-2 text-lg font-bold">{c.title}</div>
              <div className="mt-1 text-sm opacity-75">ระดับ {'★'.repeat(c.difficulty)}</div>
              {saved[k] && <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded bg-teal px-2 text-sm text-white"><CheckCircle2 size={14} aria-hidden /> {saved[k].scores.total}</div>}
            </Link>
          ))}
        </div>
      </Page>
    );
  }

  const levels = q.clues.slice(0, hintLevel).map((t, k) => ({ level: k + 1, body: fillTemplate(t, q.data) }));
  const hints: HintState = { levels, enabled: true, penalty: PENALTY };
  const fb = saved[i];

  async function submit(a: Parameters<typeof evaluateAnswer>[1], reasoning: string) {
    const key = answerKey(q);
    const r = evaluateAnswer(key, a, q.askValue);
    const scores = calculateScore({ ...r, markedEvidence: a.markedEvidence ?? 0, reasoning, hintsUsed: hintLevel, hintPenalty: PENALTY });
    const f: Feedback = { correct: r.measureCorrect && r.valueCorrect, scores, measure: key.measure, values: key.values, noMode: key.noMode, reasoning: q.reasoning, misconceptions: q.misconceptions, limitations: q.limitations };
    const next = { ...saved, [i]: f };
    setSaved(next);
    try { sessionStorage.setItem(KEY, JSON.stringify(next)); } catch { /* progress just isn't kept */ }
    setScene('result');
  }

  const last = i === DEFAULT_CASES.length - 1;
  const goNext = () => { setHintLevel(0); setScene('open'); nav(last ? '/practice' : `/practice/${i + 1}`); };

  return (
    <Page title={`${q.code} · ${q.title}`} back="/practice" right={<span className="hidden text-sm sm:inline">โหมดฝึก (ไม่บันทึกผล)</span>}>
      <Investigation key={i} q={q} draftKey={`practice:${i}`} hints={hints} score={total}
        onRevealHint={async (lv) => setHintLevel(lv)} onSubmit={submit}
        locked={!!fb} lockMsg="ส่งรายงานคดีนี้แล้ว" progressLabel={`คดี ${i + 1}/${DEFAULT_CASES.length}`} />
      {fb && (
        <div className="mt-6 space-y-4">
          <CaseReport fb={fb} data={q.data} unit={q.unit} />
          <div className="flex flex-wrap gap-2">
            <Btn onClick={() => (last ? setScene('final') : goNext())}>{last ? 'สรุปผลคดีทั้งหมด' : 'คดีถัดไป'} <ChevronRight aria-hidden /></Btn>
            <Btn variant="navy" onClick={() => { const n = { ...saved }; delete n[i]; setSaved(n); sessionStorage.setItem(KEY, JSON.stringify(n)); setHintLevel(0); }}>ลองคดีนี้ใหม่</Btn>
          </div>
        </div>
      )}
      <AnimatePresence>
        {scene === 'open' && !fb && <CaseOpenCutscene code={q.code} title={q.title} objective={q.objective} onDone={() => setScene(null)} />}
        {scene === 'result' && fb && <ResultCutscene fb={fb} unit={q.unit} onDone={() => setScene(null)} />}
        {scene === 'final' && <FinalCutscene total={total} solved={Object.values(saved).filter((f) => f.correct).length} count={DEFAULT_CASES.length} onDone={() => { setScene(null); nav('/practice'); }} />}
      </AnimatePresence>
      {!fb && <Card className="mt-6 text-sm opacity-80">เคล็ดลับ: แตะตัวเลขในชุดข้อมูลเพื่อทำเครื่องหมาย และกด “เรียงจากน้อยไปมาก” เพื่อดูการเรียงข้อมูล</Card>}
    </Page>
  );
}
