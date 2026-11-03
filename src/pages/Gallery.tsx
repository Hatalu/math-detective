import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, EyeOff, FileDown, Heart, Maximize, MessageCircle, Pencil, Send, Trash2, Upload, X } from 'lucide-react';
import { Art } from '../components/art';
import { Btn, Card, ConnectionBadge, Empty, ErrorBox, Field, Page, SetupRequired, Spinner, inputCls } from '../components/ui';
import { getQuestions, getSession, myTeam, useRealtime, type QuestionRow, type Session, type Team } from '../lib/api';
import { db, ensureStudentSession, supabase, SUPABASE_ANON_KEY, SUPABASE_URL, thaiError } from '../lib/supabase';
import { downloadCSV } from '../lib/csv';

interface Work { id: string; session_id: string; team_id: string; case_title: string; conclusion: string; reasoning: string; image_path: string; status: 'pending' | 'approved' | 'hidden'; created_at: string }
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX = 5 * 1024 * 1024;
interface Cmt { id: string; work_id: string; user_id: string; author: string; body: string; created_at: string }
const PINS = ['ui-pin-red.webp', 'ui-pin-teal.webp', 'ui-pin-gold.webp'];
const STATUS_TH = { pending: 'รออนุมัติ', approved: 'อนุมัติแล้ว', hidden: 'ซ่อน' };

/** XHR upload so we can show real progress (supabase-js upload has no progress events). */
function uploadWithProgress(path: string, file: File, token: string, onProgress: (p: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('POST', `${SUPABASE_URL}/storage/v1/object/gallery/${path}`);
    x.setRequestHeader('Authorization', `Bearer ${token}`);
    x.setRequestHeader('apikey', SUPABASE_ANON_KEY);
    x.setRequestHeader('x-upsert', 'false');
    x.setRequestHeader('Content-Type', file.type);
    x.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    x.onload = () => (x.status < 300 ? resolve() : reject(new Error(`อัปโหลดไม่สำเร็จ (${x.status}) ${x.responseText.slice(0, 120)}`)));
    x.onerror = () => reject(new Error('เครือข่ายขัดข้องระหว่างอัปโหลด ลองอีกครั้ง'));
    x.send(file);
  });
}

export default function Gallery() {
  const { sid = '' } = useParams();
  const [g, setG] = useState<Session | null>(null);
  const [isOwner, setOwner] = useState(false);
  const [team, setTeam] = useState<{ team_id: string; team_name: string } | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [qs, setQs] = useState<QuestionRow[]>([]);
  const [works, setWorks] = useState<Work[] | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [err, setErr] = useState('');
  const [sort, setSort] = useState<'time' | 'team' | 'case'>('time');
  const [big, setBig] = useState<Work | null>(null);
  const [projector, setProjector] = useState(false);
  const [me, setMe] = useState('');
  const [likes, setLikes] = useState<{ work_id: string; user_id: string }[]>([]);
  const [comments, setComments] = useState<Cmt[]>([]);

  const load = useCallback(async () => {
    try {
      const { data } = await supabase!.auth.getSession();
      const sess = data.session ?? (await ensureStudentSession());
      const s = await getSession(sid); setG(s);
      const owner = s.teacher_id === sess.user.id; setOwner(owner); setMe(sess.user.id);
      if (!owner) setTeam(await myTeam(sid));
      if (s.question_set_id && !qs.length) setQs(await getQuestions(s.question_set_id));
      const [w, t, l, c] = await Promise.all([
        db().from('work_gallery').select('*').eq('session_id', sid).order('created_at'),
        db().from('teams').select('*').eq('session_id', sid),
        db().from('gallery_likes').select('work_id,user_id').eq('session_id', sid),
        db().from('gallery_comments').select('*').eq('session_id', sid).order('created_at'),
      ]);
      if (w.error) throw w.error;
      setLikes(l.data ?? []); setComments((c.data ?? []) as Cmt[]);
      const list = w.data as Work[]; setWorks(list); setTeams((t.data ?? []) as Team[]);
      if (list.length) {
        const r = await db().storage.from('gallery').createSignedUrls(list.map((x) => x.image_path), 3600);
        setUrls(Object.fromEntries((r.data ?? []).filter((x) => x.signedUrl).map((x) => [x.path, x.signedUrl])));
      }
      setErr('');
    } catch (e) { setErr(thaiError(e)); }
  }, [sid, qs.length]);
  useEffect(() => { if (supabase) load(); }, [load]);
  const rt = useRealtime(supabase ? `gallery-${sid}` : null, [{ table: 'work_gallery', filter: `session_id=eq.${sid}` }, { table: 'gallery_likes', filter: `session_id=eq.${sid}` }, { table: 'gallery_comments', filter: `session_id=eq.${sid}` }], load);

  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? (team?.team_id === id ? team.team_name : 'ทีม');
  const sorted = useMemo(() => {
    const w = [...(works ?? [])];
    if (sort === 'team') w.sort((a, b) => teamName(a.team_id).localeCompare(teamName(b.team_id), 'th'));
    if (sort === 'case') w.sort((a, b) => a.case_title.localeCompare(b.case_title, 'th'));
    return w;
  }, [works, sort, teams]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!supabase) return <Page title="บอร์ดผลงาน"><SetupRequired /></Page>;

  const likeOf = (id: string) => ({ n: likes.filter((x) => x.work_id === id).length, mine: likes.some((x) => x.work_id === id && x.user_id === me) });
  const nComments = (id: string) => comments.filter((c) => c.work_id === id).length;
  const author = isOwner ? 'คุณครู' : team?.team_name ?? 'ผู้ชม';
  async function toggleLike(w: Work) {
    const { mine } = likeOf(w.id);
    setLikes(mine ? likes.filter((x) => !(x.work_id === w.id && x.user_id === me)) : [...likes, { work_id: w.id, user_id: me }]); // optimistic
    const r = mine ? await db().from('gallery_likes').delete().eq('work_id', w.id).eq('user_id', me)
      : await db().from('gallery_likes').insert({ work_id: w.id, session_id: sid });
    if (r.error) { setErr(thaiError(r.error)); load(); }
  }
  async function addComment(w: Work, body: string) {
    const r = await db().from('gallery_comments').insert({ work_id: w.id, session_id: sid, author, body: body.trim() });
    if (r.error) throw new Error(thaiError(r.error));
    load();
  }
  async function delComment(c: Cmt) {
    const r = await db().from('gallery_comments').delete().eq('id', c.id);
    if (r.error) setErr(thaiError(r.error)); else load();
  }
  const social = (w: Work) => w.status === 'approved' && (
    <div className="mt-2 flex items-center gap-2">
      <button onClick={() => toggleLike(w)} aria-pressed={likeOf(w.id).mine} aria-label="กดใจ"
        className={`inline-flex min-h-[44px] items-center gap-1 rounded-full px-3 font-bold transition active:scale-90 ${likeOf(w.id).mine ? 'bg-alert text-white' : 'bg-navy/10 text-navy'}`}>
        <Heart size={18} fill={likeOf(w.id).mine ? 'currentColor' : 'none'} aria-hidden /> {likeOf(w.id).n}
      </button>
      <button onClick={() => setBig(w)} className="inline-flex min-h-[44px] items-center gap-1 rounded-full bg-navy/10 px-3 font-bold text-navy" aria-label="ดูความคิดเห็น">
        <MessageCircle size={18} aria-hidden /> {nComments(w.id)}
      </button>
    </div>
  );
  const bigProps = (w: Work | null) => ({ w, url: w ? urls[w.image_path] : '', team: w ? teamName(w.team_id) : '', onClose: () => setBig(null),
    comments: w ? comments.filter((c) => c.work_id === w.id) : [], me, isOwner, social: w ? social(w) : null, onComment: addComment, onDelete: delComment });

  async function setStatus(w: Work, status: Work['status']) {
    const r = await db().from('work_gallery').update({ status }).eq('id', w.id);
    if (r.error) setErr(thaiError(r.error)); else load();
  }
  async function remove(w: Work) {
    if (!confirm('ลบผลงานนี้และรูปภาพ? ย้อนกลับไม่ได้')) return;
    const a = await db().storage.from('gallery').remove([w.image_path]);
    const b = await db().from('work_gallery').delete().eq('id', w.id);
    if (a.error || b.error) setErr(thaiError(a.error ?? b.error)); else load();
  }

  if (projector) {
    const shown = sorted.filter((w) => w.status === 'approved');
    return (
      <div className="min-h-dvh bg-navy bg-cover bg-fixed bg-center p-6 text-cream" style={{ backgroundImage: 'url(assets/bg/board-bg.webp)' }}>
        <div className="mb-4 flex items-center gap-3"><h1 className="flex-1 text-3xl font-bold text-gold">กำแพงหลักฐานของห้องเรียน</h1><Btn variant="ghost" onClick={() => setProjector(false)}><X aria-hidden /> ปิด</Btn></div>
        {shown.length === 0 ? <Empty>ยังไม่มีผลงานที่อนุมัติ</Empty> : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((w, k) => (
              <motion.button key={w.id} onClick={() => setBig(w)} initial={{ opacity: 0, y: 30, rotate: k % 2 ? 2 : -2 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: k * 0.08 }}
                className="relative bg-cream p-3 pb-4 text-left text-navy shadow-2xl">
                <Art file={PINS[k % 3]} className="absolute -top-4 left-1/2 h-9 w-9 -translate-x-1/2 object-contain drop-shadow" />
                {urls[w.image_path] ? <img src={urls[w.image_path]} alt={`ผลงานทีม ${teamName(w.team_id)}`} className="aspect-[4/3] w-full object-cover" /> : <div className="grid aspect-[4/3] place-items-center bg-navy/10">ไม่มีภาพ</div>}
                <div className="mt-2 text-lg font-bold">{teamName(w.team_id)} · {w.case_title}</div>
                <p className="line-clamp-2">{w.conclusion}</p>
                <p className="mt-1 flex gap-3 font-bold"><span className="inline-flex items-center gap-1 text-alert"><Heart size={18} fill="currentColor" aria-hidden /> {likeOf(w.id).n}</span><span className="inline-flex items-center gap-1"><MessageCircle size={18} aria-hidden /> {nComments(w.id)}</span></p>
              </motion.button>
            ))}
          </div>
        )}
        <BigView {...bigProps(big)} />
      </div>
    );
  }

  return (
    <Page title="บอร์ดโชว์ผลงาน" bg="board-bg.webp" right={<ConnectionBadge realtime={rt} />}>
      {err && <div className="mb-4"><ErrorBox msg={err} onRetry={load} /></div>}
      {!g || works === null ? <Spinner /> : (
        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <div className="space-y-4">
            {team && <UploadForm sid={sid} teamId={team.team_id} cases={qs.map((q) => `${q.content.code} ${q.content.title}`)} onDone={load} />}
            {!team && !isOwner && <ErrorBox msg="อุปกรณ์นี้ยังไม่ได้อยู่ในทีม จึงส่งผลงานไม่ได้ (เข้าห้องผ่าน QR ก่อน)" />}
            {isOwner && (
              <Card className="space-y-2">
                <h2 className="font-bold">เครื่องมือครู</h2>
                <Btn className="w-full" onClick={() => setProjector(true)}><Maximize size={18} aria-hidden /> แสดงบนโปรเจกเตอร์</Btn>
                <Btn variant="navy" className="w-full" onClick={() => downloadCSV(`gallery-${g.room_code}.csv`, [['ทีม', 'คดี', 'ข้อสรุป', 'เหตุผล', 'สถานะ', 'เวลาส่ง'], ...sorted.map((w) => [teamName(w.team_id), w.case_title, w.conclusion, w.reasoning, STATUS_TH[w.status], new Date(w.created_at).toLocaleString('th-TH')])])}>
                  <FileDown size={18} aria-hidden /> ดาวน์โหลดรายการ CSV
                </Btn>
              </Card>
            )}
          </div>
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl bg-navy/85 p-2 text-cream">
              <span className="font-semibold">เรียงตาม</span>
              {(['time', 'team', 'case'] as const).map((k) => <Btn key={k} variant={sort === k ? 'teal' : 'ghost'} onClick={() => setSort(k)} aria-pressed={sort === k}>{{ time: 'เวลาส่ง', team: 'ทีม', case: 'คดี' }[k]}</Btn>)}
            </div>
            {sorted.length === 0 ? <div className="rounded-2xl bg-cream/90 p-2"><Empty>ยังไม่มีผลงาน ส่งผลงานของทีมได้จากแผงด้านซ้าย</Empty></div> : (
              <div className="grid gap-6 pt-3 sm:grid-cols-2">
                {sorted.map((w) => {
                  const mine = team?.team_id === w.team_id;
                  return (
                    <Card key={w.id} className={`relative !rounded-sm !p-3 shadow-xl ${['rotate-[-1deg]', 'rotate-[1deg]', 'rotate-0'][sorted.indexOf(w) % 3]}`}>
                      <Art file={PINS[sorted.indexOf(w) % 3]} className="absolute -top-4 left-1/2 z-10 h-8 w-8 -translate-x-1/2 object-contain drop-shadow" />
                      <button className="block w-full" onClick={() => setBig(w)} aria-label="ดูภาพขนาดใหญ่">
                        {urls[w.image_path] ? <img src={urls[w.image_path]} alt={`ผลงานทีม ${teamName(w.team_id)}`} className="aspect-[4/3] w-full rounded object-cover" loading="lazy" /> : <div className="grid aspect-[4/3] place-items-center rounded bg-navy/10">โหลดภาพไม่ได้</div>}
                      </button>
                      <div className="mt-2 flex items-center gap-2"><b className="flex-1">{teamName(w.team_id)}</b><span className="rounded-full bg-navy/10 px-2 text-xs">{STATUS_TH[w.status]}</span></div>
                      <div className="text-sm text-teal">{w.case_title}</div>
                      <p className="mt-1">{w.conclusion}</p>
                      {w.reasoning && <p className="mt-1 text-sm opacity-75">{w.reasoning}</p>}
                      {social(w)}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {isOwner && w.status !== 'approved' && <Btn variant="teal" onClick={() => setStatus(w, 'approved')}><Check size={16} aria-hidden /> อนุมัติ</Btn>}
                        {isOwner && w.status !== 'hidden' && <Btn variant="navy" onClick={() => setStatus(w, 'hidden')}><EyeOff size={16} aria-hidden /> ซ่อน</Btn>}
                        {mine && <EditWork w={w} onDone={load} />}
                        {(isOwner || mine) && <Btn variant="danger" onClick={() => remove(w)}><Trash2 size={16} aria-hidden /> ลบ</Btn>}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      <BigView {...bigProps(big)} />
    </Page>
  );
}

function BigView({ w, url, team, onClose, comments, me, isOwner, social, onComment, onDelete }: {
  w: Work | null; url?: string; team: string; onClose: () => void; comments: Cmt[]; me: string; isOwner: boolean; social: ReactNode;
  onComment: (w: Work, body: string) => Promise<void>; onDelete: (c: Cmt) => void;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function send() {
    if (!w || !text.trim()) return;
    setBusy(true); setErr('');
    try { await onComment(w, text); setText(''); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <AnimatePresence>
      {w && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" onClick={onClose}>
          <div className="max-h-full w-full max-w-4xl overflow-auto rounded-xl bg-cream p-4 text-navy" onClick={(e) => e.stopPropagation()}>
            <button autoFocus onClick={onClose} className="mb-2 inline-flex min-h-[44px] items-center gap-1 font-semibold"><X aria-hidden /> ปิด</button>
            {url && <img src={url} alt={`ผลงานทีม ${team}`} className="max-h-[60vh] w-full object-contain" />}
            <h3 className="mt-3 text-xl font-bold">{team} · {w.case_title}</h3>
            <p className="mt-1 text-lg">{w.conclusion}</p>
            {w.reasoning && <p className="mt-1">{w.reasoning}</p>}
            {social}
            {w.status === 'approved' && (
              <section className="mt-4 border-t border-navy/10 pt-3" aria-label="ความคิดเห็น">
                <h4 className="mb-2 font-bold">ความคิดเห็น ({comments.length})</h4>
                <ul className="space-y-2">
                  {comments.map((c) => (
                    <li key={c.id} className="flex items-start gap-2 rounded-lg bg-white p-2 shadow-sm">
                      <div className="flex-1"><b className="text-teal">{c.author}</b> <span className="text-xs opacity-60">{new Date(c.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span><p>{c.body}</p></div>
                      {(isOwner || c.user_id === me) && <button onClick={() => onDelete(c)} className="grid h-11 w-11 place-items-center rounded-full hover:bg-alert/10" aria-label="ลบความคิดเห็น"><Trash2 size={16} aria-hidden /></button>}
                    </li>
                  ))}
                  {comments.length === 0 && <li className="opacity-60">ยังไม่มีความคิดเห็น เป็นคนแรกที่ชมผลงานนี้!</li>}
                </ul>
                <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
                  <input className={inputCls} value={text} onChange={(e) => setText(e.target.value)} maxLength={300} placeholder="ชมหรือถามทีมนี้ เช่น ทำไมเลือกมัธยฐาน?" aria-label="เขียนความคิดเห็น" />
                  <Btn disabled={busy || !text.trim()} aria-label="ส่งความคิดเห็น"><Send size={18} aria-hidden /></Btn>
                </form>
                {err && <div className="mt-2"><ErrorBox msg={err} /></div>}
              </section>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function EditWork({ w, onDone }: { w: Work; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [c, setC] = useState(w.conclusion);
  const [r, setR] = useState(w.reasoning);
  const [err, setErr] = useState('');
  if (!open) return <Btn variant="ghost" onClick={() => setOpen(true)}><Pencil size={16} aria-hidden /> แก้ไข</Btn>;
  return (
    <div className="w-full space-y-2">
      <textarea className={inputCls} value={c} onChange={(e) => setC(e.target.value)} maxLength={500} />
      <textarea className={inputCls} value={r} onChange={(e) => setR(e.target.value)} maxLength={1000} />
      <div className="flex gap-2">
        <Btn onClick={async () => { const x = await db().from('work_gallery').update({ conclusion: c.trim(), reasoning: r.trim() }).eq('id', w.id); if (x.error) setErr(thaiError(x.error)); else { setOpen(false); onDone(); } }} disabled={!c.trim()}>บันทึก (ต้องรออนุมัติใหม่)</Btn>
        <Btn variant="ghost" onClick={() => setOpen(false)}>ยกเลิก</Btn>
      </div>
      {err && <ErrorBox msg={err} />}
    </div>
  );
}

function UploadForm({ sid, teamId, cases, onDone }: { sid: string; teamId: string; cases: string[]; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [caseTitle, setCaseTitle] = useState(cases[0] ?? '');
  const [conclusion, setConclusion] = useState('');
  const [reasoning, setReasoning] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState(false);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function pick(f: File | undefined) {
    setErr(''); setOk(false);
    if (!f) return;
    if (!TYPES.includes(f.type)) { setErr('รองรับเฉพาะรูปภาพ JPG, PNG หรือ WEBP'); return; }
    if (f.size > MAX) { setErr(`ไฟล์ใหญ่เกิน 5 MB (ไฟล์นี้ ${(f.size / 1048576).toFixed(1)} MB) ลองถ่ายใหม่หรือย่อภาพ`); return; }
    setFile(f); setPreview(URL.createObjectURL(f));
  }
  async function send() {
    if (!file) return;
    setErr(''); setProgress(0);
    const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
    const path = `${sid}/${teamId}/${crypto.randomUUID()}.${ext}`;
    try {
      const { data } = await supabase!.auth.getSession();
      await uploadWithProgress(path, file, data.session!.access_token, setProgress);
      const r = await db().from('work_gallery').insert({ session_id: sid, team_id: teamId, case_title: caseTitle || 'ผลงานของทีม', conclusion: conclusion.trim(), reasoning: reasoning.trim(), image_path: path });
      if (r.error) { await db().storage.from('gallery').remove([path]); throw r.error; }
      setOk(true); setFile(null); setPreview(''); setConclusion(''); setReasoning(''); onDone();
    } catch (e) { setErr(thaiError(e)); } finally { setProgress(null); }
  }
  return (
    <Card className="space-y-3">
      <h2 className="text-lg font-bold">ส่งผลงานของทีม</h2>
      <Field label="ภาพผลงาน (ถ่ายรูปหรือภาพหน้าจอ, ไม่เกิน 5 MB)">
        <input type="file" accept="image/jpeg,image/png,image/webp" className="block w-full text-sm file:mr-3 file:min-h-[44px] file:rounded-lg file:border-0 file:bg-dblue file:px-4 file:text-cream" onChange={(e) => pick(e.target.files?.[0])} />
      </Field>
      {preview && <img src={preview} alt="ตัวอย่างภาพก่อนส่ง" className="max-h-56 w-full rounded object-contain ring-1 ring-navy/10" />}
      <Field label="คดี">
        {cases.length ? <select className={inputCls} value={caseTitle} onChange={(e) => setCaseTitle(e.target.value)}>{cases.map((c) => <option key={c}>{c}</option>)}</select>
          : <input className={inputCls} value={caseTitle} onChange={(e) => setCaseTitle(e.target.value)} />}
      </Field>
      <Field label="ข้อสรุปทางคณิตศาสตร์"><textarea className={inputCls} rows={2} maxLength={500} value={conclusion} onChange={(e) => setConclusion(e.target.value)} placeholder="เช่น มัธยฐาน = 15.5 นาที" /></Field>
      <Field label="ทำไมจึงเลือกค่ากลางนี้"><textarea className={inputCls} rows={3} maxLength={1000} value={reasoning} onChange={(e) => setReasoning(e.target.value)} /></Field>
      {progress !== null && <div className="h-3 overflow-hidden rounded-full bg-navy/10" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div className="h-full bg-teal transition-all" style={{ width: `${progress}%` }} /></div>}
      <Btn className="w-full" onClick={send} disabled={!file || !conclusion.trim() || progress !== null}><Upload size={18} aria-hidden /> {progress !== null ? `กำลังอัปโหลด ${progress}%` : 'ส่งผลงาน'}</Btn>
      {ok && <p className="rounded-lg bg-teal/15 p-2 text-teal">ส่งผลงานสำเร็จ รอครูอนุมัติเพื่อแสดงบนกระดาน</p>}
      {err && <ErrorBox msg={err} onRetry={file ? send : undefined} />}
    </Card>
  );
}
