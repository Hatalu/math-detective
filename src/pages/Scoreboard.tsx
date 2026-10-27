import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { LayoutGroup, motion } from 'framer-motion';
import { Card, ConnectionBadge, Empty, ErrorBox, Page, SetupRequired, Spinner } from '../components/ui';
import { AnimatedScore } from '../components/cinema';
import { getSession, scoreboard, useRealtime, type ScoreRow, type Session } from '../lib/api';
import { ensureStudentSession, supabase, thaiError } from '../lib/supabase';

// No rank numbers / "last place" styling: teams see progress and feedback, not humiliation.
export default function Scoreboard() {
  const { sid = '' } = useParams();
  const [rows, setRows] = useState<ScoreRow[] | null>(null);
  const [g, setG] = useState<Session | null>(null);
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    try {
      const { data } = await supabase!.auth.getSession();
      if (!data.session) await ensureStudentSession();
      setG(await getSession(sid)); setRows(await scoreboard(sid)); setErr('');
    } catch (e) { setErr(thaiError(e)); }
  }, [sid]);
  useEffect(() => { if (supabase) load(); }, [load]);
  const rt = useRealtime(supabase ? `score-${sid}` : null, [{ table: 'game_sessions', filter: `id=eq.${sid}` }, { table: 'submissions', filter: `session_id=eq.${sid}` }], load);
  if (!supabase) return <Page title="กระดานคะแนน"><SetupRequired /></Page>;
  const max = Math.max(100, ...(rows ?? []).map((r) => r.total));

  return (
    <Page title="กระดานคะแนนทีม" dark right={<ConnectionBadge realtime={rt} />}>
      {err && <ErrorBox msg={err} onRetry={load} />}
      {!rows ? <Spinner /> : rows.length === 0 ? <Empty>ยังไม่มีทีม</Empty> : (
        <>
          {g && !g.show_scores && <p className="mb-4 rounded-lg bg-white/10 p-3">ครูซ่อนกระดานคะแนนรวมไว้ คุณเห็นเฉพาะคะแนนของทีมตัวเอง</p>}
          <LayoutGroup>
            <ul className="space-y-3">
              {rows.map((r) => (
                <motion.li layout key={r.team_id} transition={{ type: 'spring', bounce: 0.2 }}>
                  <Card>
                    <div className="flex flex-wrap items-center gap-3">
                      <b className="flex-1 text-lg">{r.name}</b>
                      <AnimatedScore value={r.total} className="text-3xl font-black text-teal" />
                    </div>
                    <div className="mt-2 h-3 overflow-hidden rounded-full bg-navy/10"><motion.div className="h-full bg-gold" initial={{ width: 0 }} animate={{ width: `${(r.total / max) * 100}%` }} /></div>
                    <p className="mt-2 text-sm opacity-75">ส่งแล้ว {r.submitted} ภารกิจ · ถูก {r.correct} · ใช้คำใบ้ {r.hints}
                      {r.submitted > 0 && r.correct < r.submitted && ' · ลองทบทวนขั้นตอนในรายงานผลคดีที่ยังไม่ถูก'}</p>
                  </Card>
                </motion.li>
              ))}
            </ul>
          </LayoutGroup>
        </>
      )}
    </Page>
  );
}
