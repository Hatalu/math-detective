import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileDown } from 'lucide-react';
import { Btn, Card, Empty, ErrorBox, Page, Spinner } from '../components/ui';
import { TeacherGate } from './Teacher';
import { STATUS_TH, type Session } from '../lib/api';
import { db, thaiError } from '../lib/supabase';
import { downloadCSV } from '../lib/csv';

type Row = Session & { classrooms: { name: string } | null; teams: { count: number }[]; submissions: { count: number }[]; exit_ticket_responses: { count: number }[] };

function List() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState('');
  const load = async () => {
    const r = await db().from('game_sessions').select('*, classrooms(name), teams(count), submissions(count), exit_ticket_responses(count)').order('created_at', { ascending: false });
    if (r.error) setErr(thaiError(r.error)); else setRows(r.data as Row[]);
  };
  useEffect(() => { load(); }, []);
  const date = (s: string) => new Date(s).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
  return (
    <Page title="ประวัติการสอน" back="/teacher">
      {err && <ErrorBox msg={err} onRetry={load} />}
      {!rows ? <Spinner /> : rows.length === 0 ? <Empty>ยังไม่มีประวัติ</Empty> : (
        <Card>
          <div className="mb-3 flex justify-end">
            <Btn variant="navy" onClick={() => downloadCSV('session-history.csv', [['วันที่', 'ห้องเรียน', 'ชื่อคาบ', 'รหัส', 'สถานะ', 'ทีม', 'คำตอบ', 'Exit Ticket'],
              ...rows.map((r) => [date(r.created_at), r.classrooms?.name ?? '', r.title, r.room_code, STATUS_TH[r.status], r.teams[0]?.count ?? 0, r.submissions[0]?.count ?? 0, r.exit_ticket_responses[0]?.count ?? 0])])}>
              <FileDown size={18} aria-hidden /> CSV
            </Btn>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead><tr className="border-b-2 border-navy/20"><th className="py-2">วันที่</th><th>ห้องเรียน</th><th>คาบ</th><th>สถานะ</th><th>ทีม</th><th>คำตอบ</th><th>Exit</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-navy/10">
                    <td className="py-2">{date(r.created_at)}</td><td>{r.classrooms?.name ?? '-'}</td>
                    <td><Link className="font-semibold text-dblue underline" to={`/teacher/session/${r.id}`}>{r.title}</Link> <span className="font-num text-xs opacity-60">{r.room_code}</span></td>
                    <td>{STATUS_TH[r.status]}</td><td>{r.teams[0]?.count ?? 0}</td><td>{r.submissions[0]?.count ?? 0}</td><td>{r.exit_ticket_responses[0]?.count ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </Page>
  );
}

export default function History() {
  return <TeacherGate title="ประวัติการสอน" back="/teacher">{() => <List />}</TeacherGate>;
}
