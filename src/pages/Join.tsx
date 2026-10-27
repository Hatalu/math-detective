import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Users } from 'lucide-react';
import { Btn, Card, ConnectionBadge, ErrorBox, Field, Page, SetupRequired, Spinner, inputCls, useOnline } from '../components/ui';
import { joinRoom, roomStatus, STATUS_TH, type Status } from '../lib/api';
import { ensureStudentSession, supabase, thaiError } from '../lib/supabase';

export default function Join() {
  const { code: param } = useParams();
  const nav = useNavigate();
  const online = useOnline();
  const [code, setCode] = useState((param ?? '').toUpperCase());
  const [team, setTeam] = useState('');
  const [room, setRoom] = useState<{ exists: boolean; id?: string; status?: Status; join_open?: boolean; title?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function check(c = code) {
    if (c.trim().length < 4) return;
    setErr(''); setBusy(true);
    try { await ensureStudentSession(); setRoom(await roomStatus(c.trim())); }
    catch (e) { setErr(thaiError(e)); } finally { setBusy(false); }
  }
  useEffect(() => { if (param && supabase) check(param); }, [param]); // eslint-disable-line react-hooks/exhaustive-deps

  async function join() {
    setErr(''); setBusy(true);
    try {
      await ensureStudentSession();
      const r = await joinRoom(code.trim(), team.trim()); // success shown only after backend confirms membership
      nav(`/play/${r.session_id}`);
    } catch (e) { setErr(thaiError(e)); } finally { setBusy(false); }
  }

  if (!supabase) return <Page title="เข้าห้องสืบสวน" back="/hq"><SetupRequired /></Page>;

  return (
    <Page title="เข้าห้องสืบสวน" back="/hq" right={<ConnectionBadge />}>
      <Card className="mx-auto max-w-md space-y-4">
        <Field label="รหัสห้อง">
          <div className="flex gap-2">
            <input className={`${inputCls} text-center font-num text-2xl font-bold uppercase tracking-[.3em]`} maxLength={6} value={code} autoCapitalize="characters"
              onChange={(e) => { setCode(e.target.value.toUpperCase()); setRoom(null); }} placeholder="ABC123" />
            <Btn variant="navy" onClick={() => check()} disabled={busy || !online || code.length < 4}>ตรวจ</Btn>
          </div>
        </Field>
        {busy && <Spinner label="กำลังตรวจสอบ…" />}
        {room && !room.exists && <ErrorBox msg="ไม่พบห้องนี้ ตรวจสอบรหัสห้องบนจอโปรเจกเตอร์อีกครั้ง" />}
        {room?.exists && (
          <div className={`rounded-xl p-3 ${room.status === 'completed' ? 'bg-alert/10 text-alert' : 'bg-teal/10 text-teal'}`}>
            <b>{room.title}</b> · สถานะ: {STATUS_TH[room.status!]} {room.join_open ? '· เปิดรับทีม' : '· ปิดรับทีมใหม่ (ทีมเดิมเข้าต่อได้)'}
          </div>
        )}
        {room?.exists && room.status !== 'completed' && (
          <>
            <Field label="ชื่อทีม (ใช้ชื่อทีม ไม่ใช้ชื่อจริง) — เพื่อนในทีมพิมพ์ชื่อเดียวกันเพื่อเข้าทีมเดียวกัน">
              <input className={inputCls} maxLength={30} value={team} onChange={(e) => setTeam(e.target.value)} placeholder="เช่น ทีมนกฮูกทองคำ" />
            </Field>
            <Btn className="w-full" onClick={join} disabled={busy || !online || team.trim().length < 2}><Users aria-hidden /> เข้าร่วมทีม</Btn>
          </>
        )}
        {room?.exists && <Link to={`/exit/${room.id}`} className="block text-center font-semibold text-teal underline">ทำ Exit Ticket รายบุคคล</Link>}
        {err && <ErrorBox msg={err} onRetry={online ? () => (room ? join() : check()) : undefined} />}
      </Card>
    </Page>
  );
}
