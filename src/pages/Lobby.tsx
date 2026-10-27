import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Maximize } from 'lucide-react';
import { Page, ConnectionBadge, ErrorBox, Spinner } from '../components/ui';
import { RoomQR } from '../components/RoomQR';
import { HQScene } from '../components/cinema';
import { Cody } from '../components/characters';
import { useCountdown, fmtTime } from '../components/Investigation';
import { TeacherGate } from './Teacher';
import { getQuestions, getSession, scoreboard, useRealtime, STATUS_TH, type QuestionRow, type ScoreRow, type Session } from '../lib/api';
import { thaiError } from '../lib/supabase';

/** Projector screen: big QR + room code, live teams, current mission, (optional) leaderboard. */
function Screen({ sid }: { sid: string }) {
  const [g, setG] = useState<Session | null>(null);
  const [qs, setQs] = useState<QuestionRow[]>([]);
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    try {
      const s = await getSession(sid); setG(s);
      if (s.question_set_id && !qs.length) setQs(await getQuestions(s.question_set_id));
      setRows(await scoreboard(sid)); setErr('');
    } catch (e) { setErr(thaiError(e)); }
  }, [sid, qs.length]);
  useEffect(() => { load(); }, [load]);
  const rt = useRealtime(`lobby-${sid}`, [{ table: 'game_sessions', filter: `id=eq.${sid}` }, { table: 'teams', filter: `session_id=eq.${sid}` }, { table: 'submissions', filter: `session_id=eq.${sid}` }], load);
  const deadline = g?.status === 'active' && g.question_started_at && g.time_limit_sec ? new Date(g.question_started_at).getTime() + g.time_limit_sec * 1000 : null;
  const remaining = useCountdown(deadline);
  if (!g) return <Page title="จอโปรเจกเตอร์" back={`/teacher/session/${sid}`}>{err ? <ErrorBox msg={err} onRetry={load} /> : <Spinner />}</Page>;
  const q = qs[g.current_index];

  return (
    <div className="relative min-h-dvh overflow-hidden text-cream">
      <div className="fixed inset-0 opacity-60"><HQScene camX={-20} /></div>
      <div className="relative z-10 flex min-h-dvh flex-col gap-6 p-4 sm:p-8">
        <header className="flex flex-wrap items-center gap-3">
          <a href={`#/teacher/session/${sid}`} className="rounded-lg bg-black/40 px-3 py-2">← คอนโซลครู</a>
          <h1 className="flex-1 text-2xl font-bold sm:text-4xl">{g.title}</h1>
          <ConnectionBadge realtime={rt} />
          <button onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})} className="grid h-11 w-11 place-items-center rounded-full bg-black/40" aria-label="เต็มจอ"><Maximize aria-hidden /></button>
        </header>
        {err && <ErrorBox msg={err} onRetry={load} />}
        <div className="grid flex-1 items-start gap-6 lg:grid-cols-[auto_1fr]">
          <div className="rounded-3xl bg-navy/80 p-6 text-center backdrop-blur">
            <p className="mb-2 text-xl">สแกนเพื่อเข้าห้อง หรือพิมพ์รหัส</p>
            <RoomQR code={g.room_code} size={300} controls={false} />
            <p className={`mt-3 inline-block rounded-full px-4 py-1 ${g.join_open ? 'bg-teal' : 'bg-alert'}`}>{g.join_open ? 'เปิดรับทีม' : 'ปิดรับทีมใหม่'}</p>
          </div>
          <div className="space-y-4">
            <div className="rounded-3xl bg-navy/80 p-6 backdrop-blur">
              <div className="flex flex-wrap items-center gap-4">
                <span className="rounded-full bg-gold px-4 py-1 text-lg font-bold text-navy">{STATUS_TH[g.status]}</span>
                {q && g.status !== 'waiting' && <span className="text-2xl font-bold">{q.content.code} · {q.content.title}</span>}
                {remaining !== null && <span className="ml-auto font-num text-5xl font-black text-gold">{fmtTime(remaining)}</span>}
              </div>
              {g.status === 'waiting' && <div className="mt-3 flex items-center gap-3"><div className="h-20 w-20"><Cody talking /></div><p className="text-xl">ทีมที่เข้ามาแล้วจะปรากฏด้านล่าง รอครูเริ่มภารกิจ</p></div>}
            </div>
            <div className="rounded-3xl bg-navy/80 p-6 backdrop-blur">
              <h2 className="mb-3 text-2xl font-bold">ทีมนักสืบ ({rows.length})</h2>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                <AnimatePresence>
                  {rows.map((r) => (
                    <motion.li layout key={r.team_id} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}
                      className="rounded-xl bg-cream p-3 text-navy shadow-lg">
                      <div className="truncate text-lg font-bold">{r.name}</div>
                      {g.show_scores && g.status !== 'waiting' && <div className="font-num text-2xl font-black text-teal">{r.total}</div>}
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Lobby() {
  const { sid = '' } = useParams();
  return <TeacherGate title="จอโปรเจกเตอร์" back="/teacher">{() => <Screen sid={sid} />}</TeacherGate>;
}
