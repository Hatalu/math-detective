import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { History as HistoryIcon, LogOut, Pencil, Plus, Download, Play, Presentation } from 'lucide-react';
import { Btn, Card, ConnectionBadge, Empty, ErrorBox, Field, Page, SetupRequired, Spinner, inputCls } from '../components/ui';
import { createSession, saveQuestion, STATUS_TH, type Session } from '../lib/api';
import { DEFAULT_CASES } from '../lib/cases';
import { db, supabase, thaiError } from '../lib/supabase';

type Auth = { state: 'loading' } | { state: 'out' } | { state: 'notTeacher'; email: string } | { state: 'in'; uid: string; name: string };

export function useTeacher() {
  const [auth, setAuth] = useState<Auth>({ state: 'loading' });
  const check = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.auth.getUser();
    const u = data.user;
    if (!u || u.is_anonymous) return setAuth({ state: 'out' });
    const p = await supabase.from('teacher_profiles').select('display_name').eq('user_id', u.id).maybeSingle();
    setAuth(p.data ? { state: 'in', uid: u.id, name: p.data.display_name } : { state: 'notTeacher', email: u.email ?? '' });
  }, []);
  useEffect(() => { check(); const s = supabase?.auth.onAuthStateChange(() => check()); return () => s?.data.subscription.unsubscribe(); }, [check]);
  return auth;
}

/** Wrap any teacher page: shows login, "not a teacher", or the page. */
export function TeacherGate({ title, back = '/hq', children }: { title: string; back?: string; children: (uid: string, name: string) => ReactNode }) {
  const auth = useTeacher();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  if (!supabase) return <Page title={title} back={back}><SetupRequired /></Page>;
  if (auth.state === 'loading') return <Page title={title} back={back}><Spinner /></Page>;
  if (auth.state === 'in') return <>{children(auth.uid, auth.name)}</>;

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
        {auth.state === 'notTeacher' && <ErrorBox msg={`บัญชี ${auth.email} ยังไม่ได้รับสิทธิ์ครู ให้ผู้ดูแลเพิ่มใน teacher_profiles (ดู README)`} />}
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

interface SetRow { id: string; title: string; updated_at: string; questions: { count: number }[] }

function Dashboard({ uid, name }: { uid: string; name: string }) {
  const nav = useNavigate();
  const [sets, setSets] = useState<SetRow[] | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [title, setTitle] = useState('คาบสถิติ ค่ากลางของข้อมูล');
  const [cls, setCls] = useState('');
  const [setId, setSetId] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([
        db().from('question_sets').select('id,title,updated_at,questions(count)').order('updated_at', { ascending: false }),
        db().from('game_sessions').select('*').order('created_at', { ascending: false }).limit(5),
      ]);
      if (a.error) throw a.error; if (b.error) throw b.error;
      setSets(a.data as SetRow[]); setSessions(b.data as Session[]);
      if (!setId && a.data[0]) setSetId(a.data[0].id);
    } catch (e) { setErr(thaiError(e)); }
  }, [setId]);
  useEffect(() => { load(); }, [load]);

  async function importDefaults() {
    setBusy('import'); setErr('');
    try {
      const r = await db().from('question_sets').insert({ teacher_id: uid, title: 'คลังคดีเริ่มต้น (8 คดี)' }).select('id').single();
      if (r.error) throw r.error;
      for (let i = 0; i < DEFAULT_CASES.length; i++) await saveQuestion(r.data.id, i, DEFAULT_CASES[i]);
      await load(); setSetId(r.data.id);
    } catch (e) { setErr(thaiError(e)); } finally { setBusy(''); }
  }
  async function start() {
    setBusy('create'); setErr('');
    try { const s = await createSession(title, setId, cls); nav(`/teacher/session/${s.id}`); }
    catch (e) { setErr(thaiError(e)); } finally { setBusy(''); }
  }

  return (
    <Page title="ศูนย์ควบคุมครู" back="/hq" right={<ConnectionBadge />}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <p className="flex-1">สวัสดี <b>{name}</b></p>
        <Link to="/teach" className="inline-flex min-h-[44px] items-center gap-1 rounded-lg px-3 font-semibold text-dblue hover:bg-navy/5"><Presentation size={18} aria-hidden /> โหมดครูผู้สอน</Link>
        <Link to="/teacher/history" className="inline-flex min-h-[44px] items-center gap-1 rounded-lg px-3 font-semibold text-dblue hover:bg-navy/5"><HistoryIcon size={18} aria-hidden /> ประวัติการสอน</Link>
        <Btn variant="ghost" onClick={() => supabase!.auth.signOut()}><LogOut size={18} aria-hidden /> ออกจากระบบ</Btn>
      </div>
      {err && <div className="mb-4"><ErrorBox msg={err} onRetry={load} /></div>}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-xl font-bold">สร้างห้องเรียนใหม่</h2>
          {sets && sets.length === 0 ? <Empty>ยังไม่มีชุดโจทย์ กด “นำเข้าคลังคดีเริ่มต้น” ก่อน</Empty> : (
            <div className="space-y-3">
              <Field label="ชื่อห้อง/คาบเรียน"><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
              <Field label="ห้องเรียน (เช่น ม.2/1)"><input className={inputCls} value={cls} onChange={(e) => setCls(e.target.value)} placeholder="ไม่บังคับ" /></Field>
              <Field label="ชุดโจทย์">
                <select className={inputCls} value={setId} onChange={(e) => setSetId(e.target.value)}>
                  {sets?.map((s) => <option key={s.id} value={s.id}>{s.title} ({s.questions[0]?.count ?? 0} ข้อ)</option>)}
                </select>
              </Field>
              <Btn className="w-full" onClick={start} disabled={!setId || busy === 'create'}><Play aria-hidden /> สร้างห้องและรหัส QR</Btn>
            </div>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 text-xl font-bold">ชุดโจทย์ของฉัน</h2>
          {!sets ? <Spinner /> : (
            <ul className="mb-3 divide-y divide-navy/10">
              {sets.map((s) => (
                <li key={s.id} className="flex items-center gap-2 py-2">
                  <span className="flex-1">{s.title} <span className="text-sm opacity-60">({s.questions[0]?.count ?? 0} ข้อ)</span></span>
                  <Link to={`/teacher/editor/${s.id}`} className="inline-flex min-h-[44px] items-center gap-1 rounded-lg px-3 font-semibold text-teal hover:bg-teal/10"><Pencil size={16} aria-hidden /> แก้ไข</Link>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            <Btn variant="teal" onClick={() => nav('/teacher/editor')}><Plus aria-hidden /> ชุดโจทย์ใหม่</Btn>
            <Btn variant="navy" onClick={importDefaults} disabled={busy === 'import'}><Download aria-hidden /> {busy === 'import' ? 'กำลังนำเข้า…' : 'นำเข้าคลังคดีเริ่มต้น'}</Btn>
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <h2 className="mb-3 text-xl font-bold">ห้องล่าสุด</h2>
          {sessions.length === 0 ? <Empty>ยังไม่มีห้อง</Empty> : (
            <ul className="divide-y divide-navy/10">
              {sessions.map((s) => (
                <li key={s.id}><Link to={`/teacher/session/${s.id}`} className="flex min-h-[52px] items-center gap-3 py-2 hover:bg-navy/5">
                  <span className="rounded bg-navy px-2 font-num font-bold tracking-wider text-gold">{s.room_code}</span>
                  <span className="flex-1">{s.title}</span><span className="text-sm opacity-70">{STATUS_TH[s.status]}</span>
                </Link></li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </Page>
  );
}

export default function Teacher() {
  return <TeacherGate title="ศูนย์ควบคุมครู">{(uid, name) => <Dashboard uid={uid} name={name} />}</TeacherGate>;
}
