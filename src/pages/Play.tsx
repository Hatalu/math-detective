import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Hourglass, Send, XCircle } from 'lucide-react';
import { Btn, Card, ConnectionBadge, ErrorBox, Page, SetupRequired, Spinner } from '../components/ui';
import { Art } from '../components/art';
import { SceneHunt } from '../components/SceneHunt';
import { getFeedback, getQuestions, getSession, myTeam, submitAnswer, useRealtime, type Feedback, type QuestionRow, type Session, type Submission } from '../lib/api';
import { CASE_SCENES, DEFAULT_CASES, type CaseQuestion, type CaseScene } from '../lib/cases';
import { MEASURE_TH, type Measure } from '../lib/math';
import { useSettings } from '../lib/settings';
import { sfx } from '../lib/sound';
import { db, ensureStudentSession, supabase, thaiError } from '../lib/supabase';

type Reveal = Omit<Feedback, 'correct' | 'scores'>;
const MEASURES: Measure[] = ['mean', 'median', 'mode'];

function clientId(key: string) {
  // same id across retries → server returns the stored submission instead of creating a duplicate
  try { let v = sessionStorage.getItem(key); if (!v) { v = crypto.randomUUID(); sessionStorage.setItem(key, v); } return v; } catch { return crypto.randomUUID(); }
}

export default function Play() {
  const { sid = '' } = useParams();
  const [g, setG] = useState<Session | null>(null);
  const [team, setTeam] = useState<{ team_id: string; team_name: string } | null | undefined>(undefined);
  const [qs, setQs] = useState<QuestionRow[]>([]);
  const [sub, setSub] = useState<Submission | null>(null);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    if (!supabase) return;
    try {
      await ensureStudentSession();
      const t = await myTeam(sid); setTeam(t);
      if (!t) return;
      const s = await getSession(sid); setG(s);
      const list = qs.length ? qs : s.question_set_id ? await getQuestions(s.question_set_id) : [];
      if (!qs.length) setQs(list);
      const q = list[s.current_index];
      if (!q || s.status === 'waiting') { setSub(null); setReveal(null); return; }
      const r = await db().from('submissions').select('*').eq('team_id', t.team_id).eq('question_id', q.id).maybeSingle();
      setSub((r.data as Submission | null) ?? null);
      setReveal(s.reveal_answer ? await getFeedback(sid, q.id) : null); // answers stay hidden until the teacher reveals
      setErr('');
    } catch (e) { setErr(thaiError(e)); }
  }, [sid, qs]);
  useEffect(() => { load(); }, [load]);
  const rt = useRealtime(team ? `play-${sid}-${team.team_id}` : null, [
    { table: 'game_sessions', filter: `id=eq.${sid}` }, { table: 'submissions', filter: `team_id=eq.${team?.team_id}` },
  ], load);

  if (!supabase) return <Page title="คดีปริศนา" back="/hq"><SetupRequired /></Page>;
  if (team === undefined && !err) return <Page title="คดีปริศนา" back="/hq"><Spinner /></Page>;
  if (team === null) return <Page title="คดีปริศนา" back="/hq"><ErrorBox msg="เครื่องนี้ยังไม่ได้อยู่ในทีมของห้องนี้ กรุณาสแกน QR ในซองปริศนาของทีมอีกครั้ง" /></Page>;

  const q = g && g.status !== 'waiting' ? qs[g.current_index] : undefined;
  const c = DEFAULT_CASES.find((x) => x.code === q?.content.code);
  const scene = c && CASE_SCENES[c.code];
  const header = <div className="flex items-center gap-2"><span className="font-semibold">{team?.team_name}</span><ConnectionBadge realtime={rt} /></div>;

  async function submit(measures: Measure[], reasoning: string) {
    if (!navigator.onLine) throw new Error('ออฟไลน์อยู่ คำตอบยังไม่ถูกส่ง เมื่ออินเทอร์เน็ตกลับมาให้กดส่งอีกครั้ง');
    // The server grades one `measure`. Right only if the ticked set equals the case's answer set: send the key measure then, else a wrong tick.
    const right = scene!.answers.length === measures.length && scene!.answers.every((a) => measures.includes(a));
    const measure = right ? c!.measure : measures.find((x) => x !== c!.measure) ?? measures[0];
    setSub(await submitAnswer(sid, { measure, measures, values: [], noMode: false }, reasoning, clientId(`cid:${sid}:${q!.id}:${g!.question_started_at}`)));
  }

  return (
    <Page full={!!q} title={q ? `${q.content.code} ${q.content.title}` : 'คดีปริศนา'} back="/hq" right={header}>
      {err && <div className="p-2"><ErrorBox msg={err} onRetry={load} /></div>}
      {!g ? <Spinner /> : !q || !c || !scene ? (
        <Card className="mx-auto mt-6 max-w-md text-center">
          <Hourglass className="mx-auto mb-2 text-gold" size={48} aria-hidden />
          <h2 className="text-2xl font-bold">{team?.team_name} พร้อมแล้ว!</h2>
          <p className="mt-2 text-lg">รอครูเปิดคดี… หน้านี้จะเปลี่ยนเองอัตโนมัติ</p>
          <p className="mt-3 rounded-xl bg-gold/20 p-3 text-left">กติกา<br />1. แต่ละทีมส่งคำตอบได้ครั้งเดียว<br />2. ส่งแล้วจะยังไม่รู้ว่าถูกหรือผิด จนกว่าครูจะเปิดเฉลย</p>
        </Card>
      ) : sub || reveal ? (
        <div className="h-full overflow-y-auto p-3"><Result c={c} scene={scene} sub={sub} reveal={reveal} /></div>
      ) : (
        <CaseFlow key={`${q.id}:${g.question_started_at}`} c={c} scene={scene} draftKey={`${sid}:${q.id}:${g.question_started_at}`} onSubmit={submit} />
      )}
    </Page>
  );
}

/** One case for a team: hunt the clues in the scene, then choose the measure and give a reason. */
function CaseFlow({ c, scene, draftKey, onSubmit }: { c: CaseQuestion; scene: CaseScene; draftKey: string; onSubmit: (m: Measure[], r: string) => Promise<void> }) {
  const pk = draftKey + ':phase';
  const [phase, setPhase] = useState<'brief' | 'hunt' | 'answer'>(() => (sessionStorage.getItem(pk) as 'hunt' | 'answer' | null) ?? 'brief');
  useEffect(() => { try { sessionStorage.setItem(pk, phase); } catch { /* not kept */ } }, [pk, phase]);

  if (phase === 'brief') return (
    <div className="relative h-full overflow-hidden">
      <Art file={scene.bg} className="absolute inset-0 h-full w-full object-cover opacity-60" />
      <div className="relative grid h-full place-items-center overflow-y-auto p-4">
        <motion.div initial={{ scale: 0.8, rotate: -3, opacity: 0 }} animate={{ scale: 1, rotate: -1, opacity: 1 }} className="w-full max-w-lg rounded-2xl bg-cream p-5 text-navy shadow-2xl ring-4 ring-gold">
          <p className="font-num text-sm font-bold tracking-[.3em] text-alert">{c.code} · แฟ้มลับ</p>
          <h2 className="text-3xl font-black">{c.title}</h2>
          <p className="mt-2 text-lg">{c.story}</p>
          <p className="mt-3 rounded-xl bg-navy/5 p-3"><b>ภารกิจ:</b> {c.objective}</p>
          <Btn className="mt-4 w-full text-xl" onClick={() => setPhase('hunt')}>เข้าที่เกิดเหตุ</Btn>
        </motion.div>
      </div>
    </div>
  );
  if (phase === 'hunt') return <SceneHunt scene={scene} draftKey={draftKey} onDone={() => setPhase('answer')} />;
  return <AnswerForm c={c} scene={scene} draftKey={draftKey} onSubmit={onSubmit} />;
}

function AnswerForm({ c, scene, draftKey, onSubmit }: { c: CaseQuestion; scene: CaseScene; draftKey: string; onSubmit: (m: Measure[], r: string) => Promise<void> }) {
  const { s } = useSettings();
  const [m, setM] = useState<Measure[]>(() => { try { return JSON.parse(sessionStorage.getItem(draftKey + ':m') ?? '[]'); } catch { return []; } });
  const [why, setWhy] = useState(() => sessionStorage.getItem(draftKey + ':why') ?? '');
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { try { sessionStorage.setItem(draftKey + ':m', JSON.stringify(m)); sessionStorage.setItem(draftKey + ':why', why); } catch { /* not kept */ } }, [draftKey, m, why]);

  async function send() {
    setBusy(true); setErr('');
    try { await onSubmit(m, why.trim()); sfx('stamp', s.muted); } catch (e) { setErr(thaiError(e)); setAsk(false); } finally { setBusy(false); }
  }

  return (
    <div className="h-full overflow-y-auto p-3 sm:p-5">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="rounded-2xl bg-navy p-4 text-cream shadow-lg">
          <p className="text-sm text-gold">{c.dataLabel}{c.unit && ` (${c.unit})`}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {scene.items.map((it, i) => <span key={i} className="rounded-lg bg-cream px-3 py-1 font-num text-2xl font-black text-navy">{it.value.replace(/ พันบาท|Size |หมู่ /g, '')}</span>)}
          </div>
        </div>

        <h2 className="text-center text-2xl font-black sm:text-3xl">{c.prompt}</h2>
        <p className="-mt-2 text-center text-lg font-semibold text-dblue">เลือกได้มากกว่า 1 คำตอบ</p>
        <div className="grid grid-cols-3 gap-2 sm:gap-4" role="group" aria-label="เลือกค่ากลาง">
          {MEASURES.map((k) => (
            <button key={k} role="checkbox" aria-checked={m.includes(k)} onClick={() => { setM((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k])); sfx('click', s.muted); }}
              className={`flex flex-col items-center gap-1 rounded-2xl border-4 p-3 text-lg font-black transition sm:p-5 sm:text-2xl ${m.includes(k) ? 'scale-105 border-gold bg-gold text-navy shadow-[0_6px_0_#b5740a]' : 'border-navy/15 bg-white text-navy hover:border-gold'}`}>
              <Art file={`ui-icon-${k}.webp`} className="h-14 w-14 object-contain sm:h-20 sm:w-20" />
              {MEASURE_TH[k]}
            </button>
          ))}
        </div>

        <label className="block">
          <span className="mb-1 block text-xl font-bold">เหตุผลของทีม</span>
          <textarea className="w-full rounded-2xl border-4 border-navy/15 bg-white p-3 text-lg text-navy focus:border-gold focus:outline-none" rows={4} maxLength={2000}
            value={why} onChange={(e) => setWhy(e.target.value)} placeholder="ทำไมทีมเราจึงเลือกค่ากลางนี้" />
        </label>
        {err && <ErrorBox msg={err} />}
        <Btn className="w-full !min-h-[64px] text-2xl" disabled={!m.length || !why.trim() || busy} onClick={() => setAsk(true)}><Send aria-hidden /> ส่งคำตอบ</Btn>
        {(!m.length || !why.trim()) && <p className="text-center opacity-70">เลือกค่ากลางและเขียนเหตุผลก่อนส่ง</p>}
      </div>

      <AnimatePresence>
        {ask && (
          <motion.div className="fixed inset-0 z-50 grid place-items-center bg-navy/80 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
            <motion.div initial={{ scale: 0.85 }} animate={{ scale: 1 }} className="w-full max-w-md rounded-3xl bg-cream p-6 text-center text-navy shadow-2xl ring-4 ring-alert">
              <h2 id="confirm-title" className="text-2xl font-black text-alert">ส่งคำตอบได้ครั้งเดียวนะ!</h2>
              <p className="mt-2 text-lg">ทีมเลือก <b>{m.map((x) => MEASURE_TH[x]).join(' และ ')}</b><br />ส่งแล้วแก้ไขไม่ได้ ยืนยันการส่งไหม?</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Btn variant="ghost" className="!text-navy" onClick={() => setAsk(false)} disabled={busy}>ยกเลิกการส่ง</Btn>
                <Btn variant="teal" onClick={send} disabled={busy}>{busy ? 'กำลังส่ง…' : 'ยืนยัน'}</Btn>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Result({ c, scene, sub, reveal }: { c: CaseQuestion; scene: CaseScene; sub: Submission | null; reveal: Reveal | null }) {
  const mine = sub ? (sub.answer.measures ?? (sub.answer.measure ? [sub.answer.measure] : [])) : [];
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {sub && (
        <Card className="text-center">
          <p className="text-sm font-bold tracking-widest opacity-70">คำตอบของทีม</p>
          <p className="text-3xl font-black">{mine.map((x) => MEASURE_TH[x]).join(' + ') || '-'}</p>
          <p className="mt-1 whitespace-pre-wrap">{sub.reasoning}</p>
        </Card>
      )}
      {!reveal ? (
        <Card className="text-center">
          <CheckCircle2 className="mx-auto text-teal" size={48} aria-hidden />
          <h2 className="mt-1 text-2xl font-bold">ส่งคำตอบแล้ว</h2>
          <p className="text-lg">รอครูเปิดเฉลย…</p>
        </Card>
      ) : (
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className={`rounded-3xl p-5 text-center shadow-2xl ring-4 ${!sub ? 'bg-white text-navy ring-gold' : sub.is_correct ? 'bg-teal text-white ring-gold' : 'bg-alert text-white ring-cream'}`}>
          {sub && (sub.is_correct
            ? <p className="flex items-center justify-center gap-2 text-3xl font-black"><CheckCircle2 size={36} aria-hidden /> ไขคดีสำเร็จ!</p>
            : <p className="flex items-center justify-center gap-2 text-3xl font-black"><XCircle size={36} aria-hidden /> ยังไม่ถูก ลองฟังครูอธิบาย</p>)}
          {!sub && <p className="text-xl font-bold">ทีมไม่ได้ส่งคำตอบในคดีนี้</p>}
          <p className="mt-3 text-sm font-bold tracking-widest opacity-80">เฉลย</p>
          <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-3xl font-black">{scene.answers.map((k) => <span key={k} className="flex items-center gap-2"><Art file={`ui-icon-${k}.webp`} className="h-12 w-12 object-contain" />{MEASURE_TH[k]}</span>)}</p>
          <p className="mt-2 text-lg">{reveal.reasoning || c.reasoning}</p>
          <p className="mt-2 opacity-90">{scene.explain}</p>
        </motion.div>
      )}
    </div>
  );
}
