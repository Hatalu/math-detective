import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Printer } from 'lucide-react';
import { Btn, ErrorBox, Page, Spinner, inputCls } from '../components/ui';
import { joinUrl } from '../components/RoomQR';
import { getSession, type Session } from '../lib/api';
import { thaiError } from '../lib/supabase';
import { TeacherGate } from './Teacher';

export const groupName = (n: number) => `กลุ่ม ${n}`;
export const groupJoinPath = (code: string, n: number) => `/join/${code}?team=${encodeURIComponent(groupName(n))}`;

/** One printable card per group, to put in an envelope. Scanning joins that group straight into the waiting room. */
function Cards({ sid }: { sid: string }) {
  const [g, setG] = useState<Session | null>(null);
  const [n, setN] = useState(6);
  const [err, setErr] = useState('');
  useEffect(() => { getSession(sid).then(setG, (e) => setErr(thaiError(e))); }, [sid]);
  if (!g) return <Page title="พิมพ์ QR ซองจดหมาย" back={`/teacher/session/${sid}`}>{err ? <ErrorBox msg={err} /> : <Spinner />}</Page>;
  return (
    <div className="min-h-dvh bg-white text-navy">
      <div className="flex flex-wrap items-center gap-3 bg-cream p-3 print:hidden">
        <a href={`#/teacher/session/${sid}`} className="font-semibold text-dblue">← กลับห้องควบคุม</a>
        <label className="flex items-center gap-2">จำนวนกลุ่ม <input type="number" min={1} max={20} value={n} onChange={(e) => setN(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} className={`${inputCls} !w-20`} /></label>
        <Btn onClick={() => print()}><Printer size={18} aria-hidden /> พิมพ์</Btn>
        <span className="text-sm opacity-70">QR ใช้ได้กับห้องรหัส {g.room_code} เท่านั้น สร้างห้องใหม่ต้องพิมพ์ใหม่</span>
      </div>
      <div className="grid grid-cols-2 gap-4 p-4 print:gap-2 print:p-0">
        {Array.from({ length: n }, (_, k) => k + 1).map((i) => (
          <div key={i} className="flex break-inside-avoid flex-col items-center gap-2 rounded-2xl border-4 border-dashed border-navy/40 p-4 text-center">
            <div className="text-sm tracking-[.3em] text-dblue">MATH DETECTIVE · แฟ้มลับ</div>
            <div className="text-4xl font-black">{groupName(i)}</div>
            <QRCodeSVG value={joinUrl(g.room_code, groupJoinPath(g.room_code, i))} size={190} level="M" marginSize={1} />
            <p className="text-sm">สแกนด้วยมือถือ 1 เครื่องต่อกลุ่ม<br />แล้วรอครูกดเริ่มภารกิจ</p>
            <div className="font-num text-xs opacity-60">ห้อง {g.room_code} · {g.title}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PrintQR() {
  const { sid = '' } = useParams();
  return <TeacherGate title="พิมพ์ QR ซองจดหมาย" back="/teacher">{() => <Cards sid={sid} />}</TeacherGate>;
}
