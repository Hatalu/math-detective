import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Image, ListChecks, PauseCircle, Trophy } from 'lucide-react';
import { Card, ConnectionBadge, Empty, ErrorBox, Page, SetupRequired, Spinner } from '../components/ui';
import { Investigation } from '../components/Investigation';
import { CaseOpenCutscene, CaseReport, ResultCutscene, type Feedback } from '../components/CaseResult';
import { Cody } from '../components/characters';
import {
  getFeedback, getHints, getQuestions, getSession, myTeam, revealHint, submitAnswer, toFeedback, useRealtime,
  type QuestionRow, type Session, type Submission,
} from '../lib/api';
import { db, ensureStudentSession, supabase, thaiError } from '../lib/supabase';
import type { StudentAnswer } from '../lib/math';

function clientId(key: string) {
  // same id across retries → server returns the stored submission instead of creating a duplicate
  try { let v = sessionStorage.getItem(key); if (!v) { v = crypto.randomUUID(); sessionStorage.setItem(key, v); } return v; } catch { return crypto.randomUUID(); }
}

export default function Play() {
  const { sid = '' } = useParams();
  const [g, setG] = useState<Session | null>(null);
  const [team, setTeam] = useState<{ team_id: string; team_name: string } | null | undefined>(undefined);
  const [qs, setQs] = useState<QuestionRow[]>([]);
  const [hints, setHints] = useState<{ level: number; body: string }[]>([]);
  const [sub, setSub] = useState<Submission | null>(null);
  const [fb, setFb] = useState<Feedback | null>(null);
  const [reveal, setReveal] = useState<Omit<Feedback, 'correct' | 'scores'> | null>(null);
  const [err, setErr] = useState('');
  const [scene, setScene] = useState<'open' | 'result' | null>(null);
  const [seenQ, setSeenQ] = useState('');

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
      if (!q) return;
      const [h, subs] = await Promise.all([
        getHints(sid, q.id),
        db().from('submissions').select('*').eq('team_id', t.team_id).eq('question_id', q.id).maybeSingle(),
      ]);
      setHints(h);
      const mine = (subs.data as Submission | null) ?? null; setSub(mine);
      const f = mine || s.reveal_answer || s.status === 'reviewing' ? await getFeedback(sid, q.id) : null;
      setReveal(f); setFb(mine && f ? toFeedback(mine, f) : null);
      setErr('');
    } catch (e) { setErr(thaiError(e)); }
  }, [sid, qs]);

  useEffect(() => { load(); }, [load]);
  const rt = useRealtime(team ? `play-${sid}-${team.team_id}` : null, [
    { table: 'game_sessions', filter: `id=eq.${sid}` },
    { table: 'hint_unlocks', filter: `team_id=eq.${team?.team_id}` },
    { table: 'submissions', filter: `team_id=eq.${team?.team_id}` },
  ], load);

  const q = g ? qs[g.current_index] : undefined;
  useEffect(() => { if (q && q.id !== seenQ && !sub && g?.status === 'active') { setSeenQ(q.id); setScene('open'); } }, [q?.id, g?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!supabase) return <Page title="ห้องสืบสวน" back="/hq"><SetupRequired /></Page>;
  if (team === undefined && !err) return <Page title="ห้องสืบสวน" back="/hq"><Spinner /></Page>;
  if (team === null) return <Page title="ห้องสืบสวน" back="/join"><ErrorBox msg="อุปกรณ์นี้ยังไม่ได้เข้าร่วมทีมในห้องนี้ กรุณาสแกน QR หรือใส่รหัสห้องใหม่" /></Page>;

  async function submit(a: StudentAnswer, reasoning: string) {
    if (!navigator.onLine) throw new Error('ออฟไลน์อยู่ คำตอบยังไม่ถูกส่ง เมื่ออินเทอร์เน็ตกลับมาให้กดส่งอีกครั้ง');
    const s = await submitAnswer(sid, a, reasoning, clientId(`cid:${sid}:${q!.id}`));
    setSub(s);
    const f = await getFeedback(sid, q!.id);
    if (f) { setFb(toFeedback(s, f)); setScene('result'); }
  }

  const deadline = g?.question_started_at && g.time_limit_sec ? new Date(g.question_started_at).getTime() + g.time_limit_sec * 1000 : null;
  const header = <div className="flex items-center gap-2"><span className="hidden font-semibold sm:inline">{team?.team_name}</span><ConnectionBadge realtime={rt} /></div>;

  return (
    <Page title={g?.title ?? 'ห้องสืบสวน'} back="/hq" right={header}>
      {err && <div className="mb-4"><ErrorBox msg={err} onRetry={load} /></div>}
      {!g ? <Spinner /> : g.status === 'waiting' ? (
        <Card className="mx-auto max-w-md text-center">
          <div className="mx-auto h-28 w-28"><Cody /></div>
          <h2 className="text-2xl font-bold">ทีม {team?.team_name} เข้าห้องแล้ว</h2>
          <p className="mt-2">รอครูเริ่มภารกิจ… หน้านี้จะเปลี่ยนเองอัตโนมัติ</p>
        </Card>
      ) : g.status === 'completed' ? (
        <Card className="mx-auto max-w-lg space-y-3 text-center">
          <h2 className="text-2xl font-bold">ปิดแฟ้มคดีแล้ว ขอบคุณนักสืบทุกคน!</h2>
          <div className="grid gap-2 sm:grid-cols-3">
            <Link className="rounded-xl bg-gold p-3 font-bold" to={`/gallery/${sid}`}><Image className="mx-auto" aria-hidden />ส่งผลงาน</Link>
            <Link className="rounded-xl bg-teal p-3 font-bold text-white" to={`/exit/${sid}`}><ListChecks className="mx-auto" aria-hidden />Exit Ticket</Link>
            <Link className="rounded-xl bg-dblue p-3 font-bold text-white" to={`/scoreboard/${sid}`}><Trophy className="mx-auto" aria-hidden />คะแนน</Link>
          </div>
        </Card>
      ) : !q ? <Empty>ครูยังไม่ได้ใส่โจทย์ในชุดนี้</Empty> : (
        <>
          {g.status === 'paused' && <p className="mb-4 flex items-center gap-2 rounded-xl bg-gold/30 p-3 font-semibold"><PauseCircle aria-hidden /> ครูพักเกมชั่วคราว คุณยังอ่านหลักฐานได้ แต่ส่งคำตอบไม่ได้</p>}
          <Investigation key={q.id} q={q.content} draftKey={`${sid}:${q.id}`}
            hints={{ levels: hints, enabled: g.hints_enabled, penalty: g.hint_penalty }}
            onRevealHint={async (lv) => { try { setHints(await revealHint(sid, lv)); } catch (e) { throw new Error(thaiError(e)); } }}
            onSubmit={submit}
            locked={!!sub || g.status !== 'active'}
            lockMsg={sub ? 'ทีมส่งรายงานแล้ว (ระบบยืนยันแล้ว) รอครูเปิดเฉลยหรือภารกิจถัดไป' : g.status === 'reviewing' ? 'ปิดรับคำตอบแล้ว ช่วงเฉลย' : 'ยังไม่เปิดรับคำตอบ'}
            deadline={g.status === 'active' ? deadline : null}
            progressLabel={`ภารกิจ ${g.current_index + 1}/${qs.length}`} />
          {fb ? <div className="mt-6"><CaseReport fb={fb} data={q.content.data} unit={q.content.unit} /></div>
            : reveal && <div className="mt-6"><CaseReport fb={{ ...reveal, correct: false, scores: { accuracy: 0, method: 0, reasoning: 0, communication: 0, speed: 0, penalty: 0, total: 0 } }} data={q.content.data} unit={q.content.unit} /></div>}
          <AnimatePresence>
            {scene === 'open' && <CaseOpenCutscene code={q.content.code} title={q.content.title} objective={q.content.objective} onDone={() => setScene(null)} />}
            {scene === 'result' && fb && <ResultCutscene fb={fb} unit={q.content.unit} onDone={() => setScene(null)} />}
          </AnimatePresence>
        </>
      )}
    </Page>
  );
}
