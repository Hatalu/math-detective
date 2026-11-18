import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { CheckCircle2, ChevronRight, Eye, EyeOff, Lightbulb, Play, Plus, Printer, RotateCcw, Shuffle, Trash2 } from 'lucide-react';
import { Btn, Card, ConnectionBadge, Empty, ErrorBox, Page, Spinner, inputCls } from '../components/ui';
import { Art } from '../components/art';
import { GroupPicker } from '../components/GroupPicker';
import { addTeam, getQuestions, getSession, resetRoom, updateSession, useRealtime, type QuestionRow, type Session, type Submission, type Team } from '../lib/api';
import { CASE_SCENES, DEFAULT_CASES } from '../lib/cases';
import { MEASURE_TH } from '../lib/math';
import { db, thaiError } from '../lib/supabase';
import { TeacherGate } from './Teacher';

/** Teacher's control room, shown on the projector: teams, case progress, answers, reveal, random pick. */
function Control({ sid }: { sid: string }) {
  const [g, setG] = useState<Session | null>(null);
  const [qs, setQs] = useState<QuestionRow[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [open, setOpen] = useState(false);       // answers of all teams visible on the projector
  const [picker, setPicker] = useState(false);
  const [picked, setPicked] = useState('');

  const load = useCallback(async () => {
    try {
      const s = await getSession(sid); setG(s);
      if (!qs.length && s.question_set_id) setQs(await getQuestions(s.question_set_id));
      const [t, b] = await Promise.all([
        db().from('teams').select('*').eq('session_id', sid).order('created_at'),
        db().from('submissions').select('*').eq('session_id', sid),
      ]);
      if (t.error) throw t.error; if (b.error) throw b.error;
      setTeams(t.data as Team[]); setSubs(b.data as Submission[]); setErr('');
    } catch (e) { setErr(thaiError(e)); }
  }, [sid, qs.length]);
  useEffect(() => { load(); }, [load]);
  const rt = useRealtime(`teacher-${sid}`, [
    { table: 'game_sessions', filter: `id=eq.${sid}` }, { table: 'teams', filter: `session_id=eq.${sid}` }, { table: 'submissions', filter: `session_id=eq.${sid}` },
  ], load);

  async function act(f: () => Promise<unknown>) {
    setBusy(true); setErr('');
    try { await f(); await load(); } catch (e) { setErr(thaiError(e)); } finally { setBusy(false); }
  }
  const goCase = (i: number) => act(async () => {
    setOpen(false); setPicked('');
    await updateSession(sid, { status: 'active', current_index: i, reveal_answer: false, question_started_at: new Date().toISOString() });
  });

  if (!g) return <Page title="ห้องกิจกรรมทีม" back="/teacher">{err ? <ErrorBox msg={err} onRetry={load} /> : <Spinner />}</Page>;

  const q = qs[g.current_index];
  const c = DEFAULT_CASES.find((x) => x.code === q?.content.code);
  const scene = c && CASE_SCENES[c.code];
  const started = g.status !== 'waiting';
  const cur = started && q ? subs.filter((s) => s.question_id === q.id) : [];
  const subOf = (t: Team) => cur.find((s) => s.team_id === t.id);
  const revealed = g.reveal_answer;
  const last = g.current_index >= qs.length - 1;
  const pool = cur.length ? teams.filter((t) => subOf(t)) : teams;

  return (
    <Page title={`ห้อง ${g.title}`} back="/teacher" right={<ConnectionBadge realtime={rt} />}>
      {err && <div className="mb-3"><ErrorBox msg={err} onRetry={load} /></div>}

      {/* case stepper */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        {qs.map((x, i) => {
          const on = started && i === g.current_index, done = started && i < g.current_index;
          return (
            <button key={x.id} onClick={() => goCase(i)} disabled={busy} aria-current={on}
              className={`rounded-2xl p-3 text-left ring-2 transition ${on ? 'bg-gold text-navy ring-navy' : done ? 'bg-teal/15 ring-teal/40' : 'bg-white/70 ring-navy/10 hover:ring-gold'}`}>
              <span className="block font-num text-sm font-bold tracking-widest opacity-70">{x.content.code}</span>
              <span className="block text-lg font-bold leading-tight sm:text-xl">{x.content.title}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {/* controls */}
          <Card className="flex flex-wrap items-center gap-2">
            {!started ? (
              <Btn className="text-lg" onClick={() => goCase(0)} disabled={busy || !qs.length || !teams.length}><Play aria-hidden /> เริ่ม CASE 01</Btn>
            ) : (
              <>
                <Btn variant={open ? 'navy' : 'teal'} onClick={() => setOpen(!open)}>{open ? <EyeOff aria-hidden /> : <Eye aria-hidden />} {open ? 'ซ่อนคำตอบทุกทีม' : 'เปิดคำตอบทุกทีม'}</Btn>
                <Btn variant="navy" onClick={() => setPicker(true)} disabled={!teams.length}><Shuffle aria-hidden /> สุ่มทีม</Btn>
                {!revealed && <Btn variant="danger" onClick={() => act(() => updateSession(sid, { reveal_answer: true, status: 'reviewing' }))} disabled={busy}><Lightbulb aria-hidden /> เฉลย</Btn>}
                {!last && <Btn onClick={() => goCase(g.current_index + 1)} disabled={busy}>CASE ถัดไป <ChevronRight aria-hidden /></Btn>}
                {last && revealed && <Link to="/boards" className="inline-flex min-h-[48px] items-center rounded-xl bg-gold px-5 font-semibold text-navy">ไปบอร์ดโชว์ผลงาน <ChevronRight aria-hidden /></Link>}
              </>
            )}
            <span className="flex-1" />
            {started && <Btn variant="ghost" disabled={busy} onClick={() => confirm('เริ่มรอบใหม่? คำตอบทุกทีมในห้องนี้จะถูกลบ ทีมและ QR ยังใช้ได้เหมือนเดิม') && act(() => resetRoom(sid))}><RotateCcw size={18} aria-hidden /> เริ่มรอบใหม่</Btn>}
          </Card>

          {!started ? (
            <Card>
              <h2 className="text-2xl font-bold">รอเริ่มกิจกรรม</h2>
              <p className="mt-1 text-lg">1. สร้างทีมทางขวา · 2. พิมพ์ QR ใส่ซองให้แต่ละทีม · 3. ให้ทีมสแกน แล้วกด “เริ่ม CASE 01”</p>
              <p className="mt-2 rounded-xl bg-gold/20 p-3 font-semibold">กติกา: แต่ละทีมส่งคำตอบได้ครั้งเดียว และจะยังไม่รู้ว่าถูกหรือผิด จนกว่าครูจะเปิดเฉลย</p>
            </Card>
          ) : c && scene && (
            <Card className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="font-num text-sm font-bold tracking-widest text-alert">{c.code} · {scene.detective}</p>
                  <h2 className="text-2xl font-bold sm:text-3xl">{c.title}</h2>
                  <p className="mt-1 text-lg">{c.story}</p>
                </div>
                <div className="text-center"><div className="font-num text-4xl font-black">{cur.length}/{teams.length}</div><div className="text-sm">ทีมส่งแล้ว</div></div>
              </div>
              <p className="rounded-xl bg-navy/5 p-3 text-lg"><b>ข้อมูล:</b> <span className="font-num">{scene.dataText}</span> {c.unit && `(${c.unit})`}</p>
              {!revealed && <p className="rounded-xl bg-teal/10 p-3"><b>คำถามกระตุ้น (ห้ามบอกคำตอบ):</b> “{scene.teacherAsk}”</p>}
              {revealed && (
                <div className="rounded-2xl bg-gold/25 p-4 ring-2 ring-gold">
                  <p className="text-sm font-bold tracking-widest">เฉลย</p>
                  <p className="flex items-center gap-2 text-3xl font-black"><Art file={`ui-icon-${c.measure}.webp`} className="h-12 w-12 object-contain" />{MEASURE_TH[c.measure]}</p>
                  <p className="mt-1 text-lg">{c.reasoning}</p>
                  <p className="mt-2"><b>อธิบายเพิ่มเติม:</b> {scene.explain}</p>
                </div>
              )}
            </Card>
          )}

          {started && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {teams.length === 0 && <Empty>ยังไม่มีทีม</Empty>}
              {teams.map((t) => {
                const s = subOf(t), show = s && (open || picked === t.id);
                return (
                  <div key={t.id} className={`rounded-2xl p-4 shadow ring-2 ${picked === t.id ? 'bg-gold/30 ring-gold' : 'bg-white ring-navy/10'}`}>
                    <div className="flex items-center gap-2">
                      <b className="flex-1 text-xl">{t.name}</b>
                      {s ? <span className="flex items-center gap-1 rounded-full bg-teal/15 px-2 py-0.5 text-sm font-bold text-teal"><CheckCircle2 size={16} aria-hidden /> ส่งแล้ว</span>
                        : <span className="rounded-full bg-navy/10 px-2 py-0.5 text-sm">ยังไม่ส่ง</span>}
                    </div>
                    {show && (
                      <div className="mt-2">
                        <p className={`text-xl font-black ${revealed ? (s.is_correct ? 'text-teal' : 'text-alert') : ''}`}>
                          {s.answer.measure ? MEASURE_TH[s.answer.measure] : '-'} {revealed && (s.is_correct ? '✓' : '✗')}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap">{s.reasoning || <i className="opacity-60">ไม่ได้ใส่เหตุผล</i>}</p>
                      </div>
                    )}
                    {s && !show && <button onClick={() => setPicked(t.id)} className="mt-2 text-sm font-semibold text-dblue underline">เปิดคำตอบทีมนี้</button>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <TeamsPanel g={g} teams={teams} busy={busy} name={name} setName={setName}
          onAdd={() => act(async () => { await addTeam(g, name.trim()); setName(''); })}
          onDelete={(t) => confirm(`ลบทีม “${t.name}”? QR ของทีมนี้จะใช้ไม่ได้อีก`) && act(async () => { const r = await db().from('teams').delete().eq('id', t.id); if (r.error) throw r.error; })} />
      </div>

      <AnimatePresence>
        {picker && <GroupPicker names={pool.map((t) => t.name)} onPick={(i) => setPicked(pool[i].id)} onClose={() => setPicker(false)} />}
      </AnimatePresence>
    </Page>
  );
}

function TeamsPanel({ g, teams, busy, name, setName, onAdd, onDelete }: {
  g: Session; teams: Team[]; busy: boolean; name: string; setName: (s: string) => void; onAdd: () => void; onDelete: (t: Team) => void;
}) {
  const dup = teams.some((t) => t.name.toLowerCase() === name.trim().toLowerCase());
  return (
    <Card className="h-fit space-y-3">
      <h2 className="text-xl font-bold">ทีม ({teams.length})</h2>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); onAdd(); }}>
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={30} placeholder="ชื่อทีม เช่น ทีมเหยี่ยวดำ" aria-label="ชื่อทีมใหม่" />
        <Btn className="shrink-0 !px-3" disabled={busy || name.trim().length < 2 || dup} aria-label="เพิ่มทีม"><Plus aria-hidden /></Btn>
      </form>
      {dup && <p className="text-sm text-alert">มีทีมชื่อนี้แล้ว</p>}
      {teams.length === 0 ? <Empty>ยังไม่มีทีม</Empty> : (
        <ul className="divide-y divide-navy/10">
          {teams.map((t, i) => (
            <li key={t.id} className="flex items-center gap-2 py-1.5">
              <span className="w-6 font-num opacity-60">{i + 1}</span><span className="flex-1 font-semibold">{t.name}</span>
              <button onClick={() => onDelete(t)} className="grid h-10 w-10 place-items-center rounded-full text-alert hover:bg-alert/10" aria-label={`ลบทีม ${t.name}`}><Trash2 size={18} aria-hidden /></button>
            </li>
          ))}
        </ul>
      )}
      <Link to={`/print/${g.id}`} className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-dblue px-4 font-semibold text-cream ${teams.length ? '' : 'pointer-events-none opacity-50'}`}>
        <Printer size={18} aria-hidden /> พิมพ์ QR ของทุกทีม
      </Link>
    </Card>
  );
}

export default function TeacherSession() {
  const { sid = '' } = useParams();
  return <TeacherGate title="ห้องกิจกรรมทีม" back="/teacher">{() => <Control sid={sid} />}</TeacherGate>;
}
