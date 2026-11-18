import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DoorOpen, LogOut, Plus, Trash2 } from 'lucide-react';
import { Btn, Card, ConnectionBadge, Empty, ErrorBox, Field, Page, SetupRequired, Spinner, inputCls } from '../components/ui';
import { createRoom, type Session } from '../lib/api';
import { db, ensureStudentSession, supabase, thaiError } from '../lib/supabase';

type Auth = { state: 'loading' } | { state: 'out' } | { state: 'notTeacher'; email: string } | { state: 'in'; uid: string; name: string };

export function useTeacher() {
  const [auth, setAuth] = useState<Auth>({ state: 'loading' });
  const check = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.auth.getUser();
    const u = data.user;
    if (!u) return setAuth({ state: 'out' });
    const p = await supabase.from('teacher_profiles').select('display_name').eq('user_id', u.id).maybeSingle();
    setAuth(p.data ? { state: 'in', uid: u.id, name: p.data.display_name } : { state: 'notTeacher', email: u.email ?? '' });
  }, []);
  useEffect(() => { check(); const s = supabase?.auth.onAuthStateChange(() => { setTimeout(check, 0); }); /* defer: auth calls inside this callback deadlock supabase-js */ return () => s?.data.subscription.unsubscribe(); }, [check]);
  return auth;
}

/** Wrap any teacher page: shows login, "not a teacher", or the page. */
export function TeacherGate({ title, back = '/hq', children }: { title: string; back?: string; children: (uid: string, name: string) => ReactNode }) {
  const auth = useTeacher();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  if (!supabase) return <Page title={title} back={back}><SetupRequired /></Page>;
  if (auth.state === 'loading') return <Page title={title} back={back}><Spinner /></Page>;
  if (auth.state === 'in') return <>{children(auth.uid, auth.name)}</>;

  // open entry: no account, no approval. The teacher row is tied to this browser's anonymous session.
  async function quick() {
    setErr(''); setBusy(true);
    try {
      await ensureStudentSession();
      const r = await supabase!.rpc('become_teacher', { p_name: name });
      if (r.error) throw r.error;
      location.reload(); // simplest way to make the gate re-check with the new teacher row
    } catch (e) { setErr(thaiError(e)); } finally { setBusy(false); }
  }
  async function login() {
    setErr(''); setBusy(true);
    try {
      const { data } = await supabase!.auth.getSession();
      if (data.session?.user.is_anonymous) await supabase!.auth.signOut(); // a student session on a shared iPad
      const r = await supabase!.auth.signInWithPassword({ email: email.trim(), password: pw });
      if (r.error) throw new Error(r.error.message === 'Invalid login credentials' ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' : r.error.message);
    } catch (e) { setErr(thaiError(e)); } finally { setBusy(false); }
  }
  return (
    <Page title="เข้าสู่ระบบครู" back={back}>
      <Card className="mx-auto max-w-sm space-y-3">
        <h2 className="text-lg font-bold">เข้าใช้ทันที (ไม่ต้องสมัคร)</h2>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); quick(); }}>
          <Field label="ชื่อที่แสดง"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น ครูเอิร์ท" /></Field>
          <Btn className="w-full" disabled={busy}>{busy ? 'กำลังเข้า…' : 'เข้าสู่ศูนย์ควบคุมครู'}</Btn>
        </form>
        <p className="text-xs opacity-70">ข้อมูลห้องและชุดโจทย์ผูกกับเบราว์เซอร์นี้ ใช้เครื่องเดิมทุกคาบ ถ้าล้างข้อมูลเบราว์เซอร์จะเริ่มใหม่ (ต้องการใช้หลายเครื่อง ให้ล็อกอินด้วยอีเมลด้านล่าง)</p>
        <hr className="border-navy/10" />
        <h2 className="font-bold">หรือเข้าด้วยอีเมล</h2>
        {auth.state === 'notTeacher' && auth.email && <Btn variant="teal" className="w-full" disabled={busy} onClick={quick}>เปิดสิทธิ์ครูให้บัญชี {auth.email}</Btn>}
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); login(); }}>
          <Field label="อีเมล"><input className={inputCls} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
          <Field label="รหัสผ่าน"><input className={inputCls} type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required /></Field>
          <Btn className="w-full" disabled={busy}>{busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}</Btn>
        </form>
        {auth.state === 'notTeacher' && <Btn variant="navy" className="w-full" onClick={() => supabase!.auth.signOut()}>ออกจากระบบ</Btn>}
        {err && <ErrorBox msg={err} />}
      </Card>
    </Page>
  );
}

/** Rooms stay until the teacher deletes them, so one room per class can be reused lesson after lesson. */
function Dashboard({ uid, name }: { uid: string; name: string }) {
  const nav = useNavigate();
  const [rooms, setRooms] = useState<(Session & { teams: { count: number }[] })[] | null>(null);
  const [title, setTitle] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await db().from('game_sessions').select('*,teams(count)').eq('teacher_id', uid).order('created_at', { ascending: false });
    if (r.error) setErr(thaiError(r.error)); else { setRooms(r.data as never); setErr(''); }
  }, [uid]);
  useEffect(() => { load(); }, [load]);

  async function create() {
    setBusy(true); setErr('');
    try { const s = await createRoom(uid, title.trim()); nav(`/teacher/session/${s.id}`); }
    catch (e) { setErr(thaiError(e)); } finally { setBusy(false); }
  }
  async function remove(s: Session) {
    if (!confirm(`ลบห้อง “${s.title}” พร้อมทีมและคำตอบทั้งหมด? QR ที่พิมพ์ไว้จะใช้ไม่ได้อีก และย้อนกลับไม่ได้`)) return;
    const r = await db().from('game_sessions').delete().eq('id', s.id);
    if (r.error) setErr(thaiError(r.error)); else load();
  }

  return (
    <Page title="กิจกรรมทีม · ห้องของฉัน" back="/hq" right={<ConnectionBadge />}>
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="flex-1">สวัสดี <b>{name}</b></p>
          <Btn variant="ghost" onClick={() => supabase!.auth.signOut()}><LogOut size={18} aria-hidden /> ออกจากระบบ</Btn>
        </div>
        {err && <ErrorBox msg={err} onRetry={load} />}
        <Card>
          <h2 className="mb-3 text-xl font-bold">สร้างห้องใหม่</h2>
          <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); create(); }}>
            <div className="min-w-0 flex-1"><Field label="ชื่อห้อง"><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder="เช่น ม.2/1" required /></Field></div>
            <Btn className="self-end" disabled={busy || !title.trim()}><Plus aria-hidden /> {busy ? 'กำลังสร้าง…' : 'สร้างห้อง'}</Btn>
          </form>
          <p className="mt-2 text-sm opacity-70">สร้างครั้งเดียวใช้ได้ตลอด ทีมและ QR ของห้องจะอยู่จนกว่าครูจะลบ</p>
        </Card>
        <Card>
          <h2 className="mb-3 text-xl font-bold">ห้องของฉัน</h2>
          {!rooms ? <Spinner /> : rooms.length === 0 ? <Empty>ยังไม่มีห้อง สร้างห้องแรกด้านบน</Empty> : (
            <ul className="divide-y divide-navy/10">
              {rooms.map((s) => (
                <li key={s.id} className="flex items-center gap-2">
                  <Link to={`/teacher/session/${s.id}`} className="flex min-h-[60px] flex-1 items-center gap-3 rounded-lg px-2 hover:bg-navy/5">
                    <DoorOpen className="text-teal" aria-hidden />
                    <span className="flex-1"><b className="text-lg">{s.title}</b><span className="block text-sm opacity-70">{s.teams[0]?.count ?? 0} ทีม · รหัส {s.room_code}</span></span>
                  </Link>
                  <button onClick={() => remove(s)} className="grid h-11 w-11 place-items-center rounded-full text-alert hover:bg-alert/10" aria-label={`ลบห้อง ${s.title}`}><Trash2 size={18} aria-hidden /></button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </Page>
  );
}

export default function Teacher() {
  return <TeacherGate title="กิจกรรมทีม">{(uid, name) => <Dashboard uid={uid} name={name} />}</TeacherGate>;
}
