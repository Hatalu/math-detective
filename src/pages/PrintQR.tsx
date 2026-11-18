import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Printer } from 'lucide-react';
import { Btn, ErrorBox, Page, Spinner } from '../components/ui';
import { isLocalUrl, joinUrl } from '../components/RoomQR';
import { getSession, type Session, type Team } from '../lib/api';
import { db, thaiError } from '../lib/supabase';
import { TeacherGate } from './Teacher';

export const teamJoinPath = (code: string, team: string) => `/join/${code}?team=${encodeURIComponent(team)}`;

/** One printable card per team, to put in its envelope. Scanning joins that team straight away. */
function Cards({ sid }: { sid: string }) {
  const [g, setG] = useState<Session | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [err, setErr] = useState('');
  useEffect(() => {
    Promise.all([getSession(sid), db().from('teams').select('*').eq('session_id', sid).order('created_at')])
      .then(([s, t]) => { if (t.error) throw t.error; setG(s); setTeams(t.data as Team[]); })
      .catch((e) => setErr(thaiError(e)));
  }, [sid]);
  if (!g) return <Page title="พิมพ์ QR ของทีม" back={`/teacher/session/${sid}`}>{err ? <ErrorBox msg={err} /> : <Spinner />}</Page>;
  const local = isLocalUrl(joinUrl(g.room_code));
  return (
    <div className="min-h-dvh bg-white text-navy">
      <div className="flex flex-wrap items-center gap-3 bg-cream p-3 print:hidden">
        <a href={`#/teacher/session/${sid}`} className="font-semibold text-dblue">← กลับห้อง {g.title}</a>
        <Btn onClick={() => print()}><Printer size={18} aria-hidden /> พิมพ์</Btn>
        <span className="text-sm opacity-70">QR ใช้ได้ตลอดจนกว่าครูจะลบทีมหรือลบห้อง</span>
        {local && <span className="rounded bg-alert/15 p-1 text-sm text-alert">กำลังเปิดจาก localhost: QR นี้มือถือนักเรียนเปิดไม่ได้ ให้พิมพ์จากเว็บจริง</span>}
      </div>
      <div className="grid grid-cols-2 gap-4 p-4 print:gap-2 print:p-0">
        {teams.map((t) => (
          <div key={t.id} className="flex break-inside-avoid flex-col items-center gap-2 rounded-2xl border-4 border-dashed border-navy/40 p-4 text-center">
            <div className="text-sm tracking-[.3em] text-dblue">MATH DETECTIVE · ซองปริศนา</div>
            <div className="text-3xl font-black">{t.name}</div>
            <QRCodeSVG value={joinUrl(g.room_code, teamJoinPath(g.room_code, t.name))} size={190} level="M" marginSize={1} />
            <p className="text-sm">สแกนด้วยมือถือ 1 เครื่องต่อทีม<br />แล้วรอครูเริ่มคดี</p>
            <div className="text-xs opacity-60">ห้อง {g.title}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PrintQR() {
  const { sid = '' } = useParams();
  return <TeacherGate title="พิมพ์ QR ของทีม" back="/teacher">{() => <Cards sid={sid} />}</TeacherGate>;
}
