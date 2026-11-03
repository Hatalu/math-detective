import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Images, Plus, Trash2 } from 'lucide-react';
import { Btn, Card, Empty, ErrorBox, Field, Page, Spinner, inputCls } from '../components/ui';
import { db, thaiError } from '../lib/supabase';
import { TeacherGate } from './Teacher';

interface BoardRow { id: string; code: string; title: string; created_at: string }

/** Teacher list of showcase boards. Students never come here: they scan a board's QR. */
export default function Boards() {
  return <TeacherGate title="บอร์ดโชว์ผลงาน" back="/hq">{() => <List />}</TeacherGate>;
}

function List() {
  const [rows, setRows] = useState<BoardRow[] | null>(null);
  const [title, setTitle] = useState('ผลงานค่ากลาง ม.2');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const { data: u } = await db().auth.getUser();
    const r = await db().from('boards').select('id,code,title,created_at').eq('teacher_id', u.user!.id).order('created_at', { ascending: false });
    if (r.error) setErr(thaiError(r.error)); else setRows(r.data);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function create() {
    setBusy(true); setErr('');
    const r = await db().from('boards').insert({ title: title.trim() }).select('id').single();
    setBusy(false);
    if (r.error) setErr(thaiError(r.error)); else load();
  }
  async function remove(b: BoardRow) {
    if (!confirm(`ลบบอร์ด “${b.title}” และผลงานทั้งหมดในบอร์ด? ย้อนกลับไม่ได้`)) return;
    const files = await db().storage.from('board').list(b.id, { limit: 1000 });
    if (files.data?.length) await db().storage.from('board').remove(files.data.map((f) => `${b.id}/${f.name}`));
    const r = await db().from('boards').delete().eq('id', b.id);
    if (r.error) setErr(thaiError(r.error)); else load();
  }

  return (
    <Page title="บอร์ดโชว์ผลงาน" back="/hq" bg="board-bg.webp">
      <div className="mx-auto max-w-2xl space-y-4">
        <Card className="space-y-3">
          <h2 className="text-lg font-bold">สร้างบอร์ดใหม่</h2>
          <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); create(); }}>
            <div className="min-w-0 flex-1"><Field label="ชื่อบอร์ด"><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} required /></Field></div>
            <Btn className="self-end" disabled={busy || !title.trim()}><Plus size={18} aria-hidden /> สร้างบอร์ด</Btn>
          </form>
          {err && <ErrorBox msg={err} />}
        </Card>
        <Card>
          <h2 className="mb-2 text-lg font-bold">บอร์ดของฉัน</h2>
          {!rows ? <Spinner /> : rows.length === 0 ? <Empty>ยังไม่มีบอร์ด</Empty> : (
            <ul className="divide-y divide-navy/10">
              {rows.map((b) => (
                <li key={b.id} className="flex items-center gap-2 py-2">
                  <Link to={`/board/${b.code}`} className="flex min-h-[52px] flex-1 items-center gap-3 rounded-lg px-2 hover:bg-navy/5">
                    <Images className="text-teal" aria-hidden />
                    <span className="flex-1"><b>{b.title}</b><span className="block text-sm opacity-70">รหัส {b.code} · {new Date(b.created_at).toLocaleDateString('th-TH')}</span></span>
                  </Link>
                  <button onClick={() => remove(b)} className="grid h-11 w-11 place-items-center rounded-full text-alert hover:bg-alert/10" aria-label={`ลบบอร์ด ${b.title}`}><Trash2 size={18} aria-hidden /></button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </Page>
  );
}
