import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Eye, EyeOff, FileDown, Flag, Image, Lightbulb, ListChecks, Lock, Mail, MonitorPlay, Pause, Play, QrCode, RotateCcw, Shuffle, SkipForward, Trophy, Unlock } from 'lucide-react';
import { GroupPicker } from '../components/GroupPicker';
import { Btn, Card, ConnectionBadge, Empty, ErrorBox, Page, Spinner, inputCls } from '../components/ui';
import { RoomQR } from '../components/RoomQR';
import { CalculationStepReveal } from '../components/mathviz';
import { useCountdown, fmtTime } from '../components/Investigation';
import { TeacherGate } from './Teacher';
import { getQuestions, getSession, updateSession, useRealtime, STATUS_TH, type QuestionRow, type Session, type Submission, type Team } from '../lib/api';
import { db, thaiError } from '../lib/supabase';
import { MEASURE_TH, fmt, type ExpectedAnswer } from '../lib/math';
import { downloadCSV } from '../lib/csv';

interface ExitRow { student_label: string; answer1: string; answer2: string; answer3: string; submitted_at: string }

function Live({ sid }: { sid: string }) {
  const [g, setG] = useState<Session | null>(null);
  const [qs, setQs] = useState<QuestionRow[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [key, setKey] = useState<ExpectedAnswer | null>(null);
  const [exits, setExits] = useState<ExitRow[]>([]);
  const [err, setErr] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [opened, setOpened] = useState<string[]>([]); // teams whose answer the teacher opened (this mission)
  const [picker, setPicker] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await getSession(sid); setG(s);
      const list = s.question_set_id ? await getQuestions(s.question_set_id) : []; setQs(list);
      const [t, sb, ex] = await Promise.all([
        db().from('teams').select('*').eq('session_id', sid).order('created_at'),
        db().from('submissions').select('*').eq('session_id', sid),
        db().from('exit_ticket_responses').select('student_label,answer1,answer2,answer3,submitted_at').eq('session_id', sid).order('submitted_at'),
      ]);
      if (t.error) throw t.error; if (sb.error) throw sb.error;
      setTeams(t.data as Team[]); setSubs(sb.data as Submission[]); setExits((ex.data ?? []) as ExitRow[]);
      const q = list[s.current_index];
      if (q) { const a = await db().from('question_answers').select('expected').eq('question_id', q.id).maybeSingle(); setKey((a.data?.expected as ExpectedAnswer) ?? null); }
      setErr('');
    } catch (e) { setErr(thaiError(e)); }
  }, [sid]);
  useEffect(() => { load(); }, [load]);
  const rt = useRealtime(`teacher-${sid}`, [
    { table: 'game_sessions', filter: `id=eq.${sid}` }, { table: 'teams', filter: `session_id=eq.${sid}` },
    { table: 'submissions', filter: `session_id=eq.${sid}` }, { table: 'exit_ticket_responses', filter: `session_id=eq.${sid}` },
  ], load);

  const deadline = g?.status === 'active' && g.question_started_at && g.time_limit_sec ? new Date(g.question_started_at).getTime() + g.time_limit_sec * 1000 : null;
  const remaining = useCountdown(deadline);
  // when time runs out, close answers automatically (server also rejects late answers)
  useEffect(() => { if (remaining === 0 && g?.status === 'active') act({ status: 'reviewing' }); }, [remaining]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!g) return <Page title="ห้องเรียน" back="/teacher">{err ? <ErrorBox msg={err} onRetry={load} /> : <Spinner />}</Page>;
  const q = qs[g.current_index];
  const cur = subs.filter((s) => s.question_id === q?.id);
  const totals = (tid: string) => subs.filter((s) => s.team_id === tid).reduce((a, s) => a + s.total_score, 0);
  const allIn = teams.length > 0 && cur.length === teams.length;
  const open1 = (tid: string) => setOpened((o) => (o.includes(tid) ? o : [...o, tid]));

  async function act(patch: Partial<Session>, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    try { setG(await updateSession(sid, patch)); } catch (e) { setErr(thaiError(e)); }
  }
  const now = () => new Date().toISOString();
  const startMission = (index: number) => { setOpened([]); return act({ status: 'active', current_index: index, question_started_at: now(), paused_at: null, reveal_answer: false, revealed_hint_level: 0 }); };
  const resume = () => {
    const shift = g.paused_at && g.question_started_at ? Date.now() - new Date(g.paused_at).getTime() : 0;
    act({ status: 'active', paused_at: null, question_started_at: g.question_started_at ? new Date(new Date(g.question_started_at).getTime() + shift).toISOString() : now() });
  };
  async function grade(s: Submission, patch: Partial<Submission>) {
    const r = await db().from('submissions').update(patch).eq('id', s.id).select().single(); // total recomputed + logged by DB trigger
    if (r.error) setErr(thaiError(r.error)); else setSubs((x) => x.map((y) => (y.id === s.id ? (r.data as Submission) : y)));
  }
  async function resetScores() {
    if (!confirm('ลบคำตอบ คะแนน และคำใบ้ที่เปิดแล้วของทุกทีมในห้องนี้? ย้อนกลับไม่ได้')) return;
    const a = await db().from('submissions').delete().eq('session_id', sid);
    const b = await db().from('hint_unlocks').delete().in('team_id', teams.map((t) => t.id));
    if (a.error || b.error) setErr(thaiError(a.error ?? b.error)); else load();
  }
  function exportCSV() {
    const rows: (string | number | boolean)[][] = [['ทีม', 'ภารกิจ', 'คดี', 'ค่ากลางที่เลือก', 'คำตอบ', 'ถูกต้อง', 'ความถูกต้อง', 'วิธีคำนวณ', 'เหตุผล', 'สื่อสาร', 'โบนัสเวลา', 'หักคำใบ้', 'รวม', 'คำใบ้ที่ใช้', 'เหตุผลของทีม', 'เวลาส่ง']];
    for (const s of subs) {
      const t = teams.find((x) => x.id === s.team_id); const qi = qs.findIndex((x) => x.id === s.question_id);
      rows.push([t?.name ?? '', qi + 1, qs[qi]?.content.title ?? '', s.answer.measure ? MEASURE_TH[s.answer.measure] : '', s.answer.noMode ? 'ไม่มีฐานนิยม' : s.answer.values.join(' '), s.is_correct,
        s.accuracy_score, s.method_score, s.reasoning_score, s.communication_score, s.speed_bonus, s.hint_penalty, s.total_score, s.hints_used, s.reasoning, new Date(s.submitted_at).toLocaleString('th-TH')]);
    }
    downloadCSV(`scores-${g!.room_code}.csv`, rows);
  }

  const toggle = (on: boolean, label: string, onClick: () => void, Icon: typeof Eye, OffIcon: typeof Eye) =>
    <Btn variant={on ? 'teal' : 'ghost'} onClick={onClick} aria-pressed={on}>{on ? <Icon size={18} aria-hidden /> : <OffIcon size={18} aria-hidden />} {label}</Btn>;

  return (
    <Page title={`${g.title} · ${STATUS_TH[g.status]}`} back="/teacher" right={<ConnectionBadge realtime={rt} />}>
      {err && <div className="mb-4"><ErrorBox msg={err} onRetry={load} /></div>}
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <Card className="space-y-2">
            <div className="text-center"><span className="text-sm opacity-70">รหัสห้อง</span><div className="font-num text-3xl font-black tracking-[.25em]">{g.room_code}</div></div>
            <Link to={`/print/${sid}`} className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-gold px-3 font-bold"><Mail size={18} aria-hidden /> พิมพ์ QR ใส่ซองจดหมาย</Link>
            <Link to={`/lobby/${sid}`} className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-navy/10 px-3 font-semibold"><MonitorPlay size={18} aria-hidden /> จอโปรเจกเตอร์</Link>
            <button onClick={() => setShowQR((x) => !x)} className="flex min-h-[44px] w-full items-center justify-center gap-2 text-sm font-semibold text-dblue" aria-expanded={showQR}><QrCode size={16} aria-hidden /> {showQR ? 'ซ่อน QR ห้อง' : 'แสดง QR ห้อง (ไม่จำเป็น)'}</button>
            {showQR && <RoomQR code={g.room_code} size={180} />}
          </Card>
          <Card>
            <h2 className="mb-2 font-bold">ตั้งค่าห้อง</h2>
            <div className="space-y-2 text-sm">
              <label className="flex items-center justify-between gap-2">เวลาต่อภารกิจ (นาที)
                <input type="number" min={0} max={60} className={`${inputCls} !w-24`} defaultValue={g.time_limit_sec / 60} onBlur={(e) => act({ time_limit_sec: Math.round(Math.max(0, Math.min(60, Number(e.target.value))) * 60) })} />
              </label>
              <label className="flex items-center justify-between gap-2">หักคะแนนต่อคำใบ้ (0 = ไม่หัก)
                <input type="number" min={0} max={30} className={`${inputCls} !w-24`} defaultValue={g.hint_penalty} onBlur={(e) => act({ hint_penalty: Math.max(0, Math.min(30, Number(e.target.value))) })} />
              </label>
              <p className="text-xs opacity-60">0 นาที = ไม่จับเวลา</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {toggle(g.join_open, g.join_open ? 'เปิดรับทีม' : 'ปิดรับทีม', () => act({ join_open: !g.join_open }), Unlock, Lock)}
              {toggle(g.hints_enabled, 'คำใบ้', () => act({ hints_enabled: !g.hints_enabled }), Lightbulb, EyeOff)}
              {toggle(g.show_scores, 'แสดงคะแนน', () => act({ show_scores: !g.show_scores }), Eye, EyeOff)}
              {toggle(g.speed_bonus, 'โบนัสเวลา', () => act({ speed_bonus: !g.speed_bonus }), Eye, EyeOff)}
            </div>
          </Card>
          <Card className="space-y-2">
            <Link to={`/scoreboard/${sid}`} className="flex min-h-[44px] items-center gap-2 font-semibold text-dblue"><Trophy size={18} aria-hidden /> กระดานคะแนน</Link>
            <Link to={`/gallery/${sid}`} className="flex min-h-[44px] items-center gap-2 font-semibold text-dblue"><Image size={18} aria-hidden /> บอร์ดผลงาน (อนุมัติ/ซ่อน)</Link>
            <Btn variant="navy" className="w-full" onClick={exportCSV}><FileDown size={18} aria-hidden /> ดาวน์โหลดคะแนน CSV</Btn>
            <Btn variant="danger" className="w-full" onClick={resetScores}><RotateCcw size={18} aria-hidden /> รีเซ็ตคะแนนห้องนี้</Btn>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1">
                <div className="text-sm opacity-70">ภารกิจ {g.current_index + 1}/{qs.length} · ทีมเข้าร่วม {teams.length} · ส่งแล้ว {cur.length}/{teams.length}</div>
                <h2 className="text-xl font-bold">{q ? `${q.content.code} ${q.content.title}` : 'ไม่มีโจทย์ในชุดนี้'}</h2>
              </div>
              {remaining !== null && <span className={`rounded-full px-4 py-1 font-num text-xl font-bold ${remaining < 60 ? 'bg-alert/15 text-alert' : 'bg-navy/10'}`}>{fmtTime(remaining)}</span>}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {g.status === 'waiting' && <Btn onClick={() => startMission(0)} disabled={!qs.length || !teams.length}><Play aria-hidden /> เริ่มเกม</Btn>}
              {g.status === 'active' && <Btn variant="navy" onClick={() => act({ status: 'paused', paused_at: now() })}><Pause aria-hidden /> หยุดชั่วคราว</Btn>}
              {g.status === 'paused' && <Btn onClick={resume}><Play aria-hidden /> เล่นต่อ</Btn>}
              {(g.status === 'active' || g.status === 'paused') && <Btn variant="teal" onClick={() => act({ status: 'reviewing' })}><Lock aria-hidden /> ปิดรับคำตอบ</Btn>}
              {g.status !== 'waiting' && g.status !== 'completed' && <Btn variant="navy" onClick={() => act({ revealed_hint_level: Math.min(3, g.revealed_hint_level + 1) })} disabled={g.revealed_hint_level >= 3}><Lightbulb aria-hidden /> เปิดคำใบ้ให้ทุกทีม ({g.revealed_hint_level}/3)</Btn>}
              {g.status !== 'waiting' && <Btn variant={g.reveal_answer ? 'teal' : 'navy'} onClick={() => act({ reveal_answer: !g.reveal_answer })}><Eye aria-hidden /> {g.reveal_answer ? 'ซ่อนเฉลย' : 'เปิดเฉลยให้นักเรียน'}</Btn>}
              {g.status !== 'waiting' && g.status !== 'completed' && g.current_index < qs.length - 1 && (
                <Btn onClick={() => startMission(g.current_index + 1)}><SkipForward aria-hidden /> {g.status === 'reviewing' ? 'ภารกิจถัดไป' : 'ข้ามภารกิจ'}</Btn>
              )}
              {g.status !== 'completed' && g.status !== 'waiting' && <Btn variant="danger" onClick={() => act({ status: 'completed', join_open: false }, 'จบเกมและปิดห้อง?')}><Flag aria-hidden /> จบเกม</Btn>}
            </div>
          </Card>

          {q && key && (
            <Card>
              <button className="flex min-h-[44px] w-full items-center justify-between font-bold" onClick={() => setShowKey((x) => !x)} aria-expanded={showKey}>
                {/* hidden by default: this screen may be on the projector */}
                {showKey ? <>เฉลยสำหรับครู: {MEASURE_TH[key.measure]} = {key.noMode ? 'ไม่มีฐานนิยม' : key.values.map(fmt).join(' และ ')} {q.content.unit}</> : 'เฉลยสำหรับครู (ซ่อนอยู่)'}
                <span className="text-sm text-teal">{showKey ? 'ซ่อนเฉลย' : 'แตะเพื่อดูเฉลย'}</span>
              </button>
              {showKey && <div className="mt-3"><CalculationStepReveal measure={key.measure} data={q.content.data} /></div>}
            </Card>
          )}

          <Card>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h2 className="flex-1 text-lg font-bold">มอนิเตอร์กลุ่ม · ส่งแล้ว {cur.length}/{teams.length}</h2>
              {g.status !== 'waiting' && <Btn onClick={() => setPicker(true)} disabled={!teams.length}><Shuffle size={18} aria-hidden /> สุ่มกลุ่มตอบ</Btn>}
            </div>
            {allIn && <p className="mb-3 flex items-center gap-2 rounded-xl bg-teal p-3 text-lg font-bold text-white"><CheckCircle2 aria-hidden /> ครบแล้ว! ทุกกลุ่มส่งคำตอบแล้ว กด “เปิดดู” ทีละกลุ่ม หรือ “สุ่มกลุ่มตอบ”</p>}
            {teams.length === 0 ? <Empty>ยังไม่มีกลุ่มเข้าห้อง ให้แต่ละกลุ่มสแกน QR ในซองจดหมาย</Empty> : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {teams.map((t) => {
                  const s = cur.find((x) => x.team_id === t.id);
                  const isOpen = !!s && opened.includes(t.id);
                  return (
                    <li key={t.id} className={`rounded-xl border-2 p-3 ${s ? 'border-teal bg-teal/5' : 'border-navy/10'} ${isOpen ? 'sm:col-span-2' : ''}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <b className="flex-1 text-lg">{t.name}</b>
                        {/* no right/wrong or score here: the projector must not let groups copy each other */}
                        <span className={`rounded-full px-3 py-0.5 text-sm font-semibold ${s ? 'bg-teal text-white' : 'bg-navy/10'}`}>{s ? '✓ ส่งแล้ว' : g.status === 'waiting' ? 'พร้อมแล้ว' : 'กำลังสืบสวน…'}</span>
                        {s && !isOpen && <Btn variant="navy" onClick={() => open1(t.id)}><Eye size={16} aria-hidden /> เปิดดู</Btn>}
                        {isOpen && <Btn variant="ghost" onClick={() => setOpened((o) => o.filter((x) => x !== t.id))}><EyeOff size={16} aria-hidden /> ปิด</Btn>}
                      </div>
                      {isOpen && s && (
                        <div className="mt-2 space-y-2 text-sm">
                          <p className="text-lg">เลือก: <b className="text-2xl">{s.answer.measure ? MEASURE_TH[s.answer.measure] : '-'}</b>{q?.content.askValue && <> = {s.answer.noMode ? 'ไม่มีฐานนิยม' : s.answer.values.map(fmt).join(', ')}</>}
                            <span className={`ml-2 rounded-full px-2 text-sm ${s.is_correct ? 'bg-teal text-white' : 'bg-gold/40'}`}>{s.is_correct ? 'ถูก' : 'ยังไม่ถูก'}</span> <span className="text-sm opacity-70">· คำใบ้ {s.hints_used} · คะแนน {s.total_score} · รวม {totals(t.id)}</span></p>
                          <p className="whitespace-pre-wrap rounded bg-navy/5 p-2">{s.reasoning || '(ไม่ได้เขียนเหตุผล)'}</p>
                          <div className="flex flex-wrap gap-3">
                            <label>เหตุผล <select className="min-h-[40px] rounded border px-1" value={s.reasoning_score} onChange={(e) => grade(s, { reasoning_score: Number(e.target.value) })}>{[0, 5, 10, 15, 20, 25].map((v) => <option key={v}>{v}</option>)}</select>/25</label>
                            <label>สื่อสารในทีม <select className="min-h-[40px] rounded border px-1" value={s.communication_score} onChange={(e) => grade(s, { communication_score: Number(e.target.value) })}>{[0, 1, 2, 3, 4, 5].map((v) => <option key={v}>{v}</option>)}</select>/5</label>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h2 className="flex flex-1 items-center gap-2 text-lg font-bold"><ListChecks aria-hidden /> Exit Ticket (รายบุคคล) {exits.length} คน</h2>
              <Link to={`/exit/${sid}`} className="font-semibold text-teal underline">เปิดหน้า Exit Ticket</Link>
              <Btn variant="navy" disabled={!exits.length} onClick={() => downloadCSV(`exit-ticket-${g.room_code}.csv`, [['ผู้ตอบ', 'ข้อ 1', 'ข้อ 2', 'ข้อ 3', 'ตอบครบ', 'เวลา'], ...exits.map((e) => [e.student_label, e.answer1, e.answer2, e.answer3, !!(e.answer1.trim() && e.answer2.trim() && e.answer3.trim()), new Date(e.submitted_at).toLocaleString('th-TH')])])}><FileDown size={18} aria-hidden /> CSV</Btn>
            </div>
            {exits.length === 0 ? <Empty>ยังไม่มีคำตอบ</Empty> : (
              <>
                <p className="mb-2 text-sm">ตอบครบ 3 ข้อ {exits.filter((e) => e.answer1.trim() && e.answer2.trim() && e.answer3.trim()).length}/{exits.length} คน ·
                  ข้อ 2 ตอบ “ฐานนิยม” {exits.filter((e) => e.answer2.includes('ฐานนิยม')).length} คน</p>
                <div className="max-h-72 overflow-auto"><table className="w-full text-left text-sm"><thead><tr><th>ผู้ตอบ</th><th>ข้อ 1</th><th>ข้อ 2</th><th>ข้อ 3</th></tr></thead>
                  <tbody>{exits.map((e, k) => <tr key={k} className="border-t border-navy/10 align-top"><td className="py-1 font-semibold">{e.student_label}</td><td>{e.answer1}</td><td>{e.answer2}</td><td>{e.answer3}</td></tr>)}</tbody></table></div>
              </>
            )}
          </Card>
        </div>
      </div>
      <AnimatePresence>
        {picker && <GroupPicker names={(cur.length ? teams.filter((t) => cur.some((s) => s.team_id === t.id)) : teams).map((t) => t.name)}
          onPick={(i) => { const pool = cur.length ? teams.filter((t) => cur.some((s) => s.team_id === t.id)) : teams; open1(pool[i].id); }}
          onClose={() => setPicker(false)} />}
      </AnimatePresence>
    </Page>
  );
}

export default function TeacherSession() {
  const { sid = '' } = useParams();
  return <TeacherGate title="ห้องเรียน" back="/teacher">{() => <Live sid={sid} />}</TeacherGate>;
}
