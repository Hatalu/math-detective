import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Eye, EyeOff, Heart, MessageCircle, QrCode, Send, Trash2, Upload, X } from 'lucide-react';
import { Btn, Card, ConnectionBadge, Empty, ErrorBox, Field, Page, SetupRequired, Spinner, inputCls } from '../components/ui';
import { Art } from '../components/art';
import { RoomQR } from '../components/RoomQR';
import { useRealtime } from '../lib/api';
import { db, ensureStudentSession, supabase, thaiError } from '../lib/supabase';
import { uploadWithProgress } from './Gallery';

interface BoardRow { id: string; code: string; title: string; teacher_id: string }
interface Post { id: string; user_id: string; author: string; caption: string; image_path: string; hidden: boolean; created_at: string }
interface Cmt { id: string; post_id: string; user_id: string; author: string; body: string; created_at: string }
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX = 5 * 1024 * 1024;
const PINS = ['ui-pin-red.webp', 'ui-pin-teal.webp', 'ui-pin-gold.webp'];
const NAME_KEY = 'md-board-name'; // per-device convenience only

/** Standalone showcase board: #/board/<code>. Students scan the QR, post a worksheet photo, heart and comment. */
export default function Board() {
  const { code = '' } = useParams();
  const [b, setB] = useState<BoardRow | null | undefined>(undefined);
  const [me, setMe] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [likes, setLikes] = useState<{ post_id: string; user_id: string }[]>([]);
  const [comments, setComments] = useState<Cmt[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [err, setErr] = useState('');
  const [big, setBig] = useState<Post | null>(null);
  const [qr, setQr] = useState(false);
  const [name, setName] = useState(() => { try { return localStorage.getItem(NAME_KEY) ?? ''; } catch { return ''; } });
  useEffect(() => { try { localStorage.setItem(NAME_KEY, name); } catch { /* not kept */ } }, [name]);

  const load = useCallback(async () => {
    try {
      const sess = await ensureStudentSession(); setMe(sess.user.id);
      const r = await db().from('boards').select('id,code,title,teacher_id').eq('code', code.toUpperCase()).maybeSingle();
      if (r.error) throw r.error;
      setB(r.data); if (!r.data) return;
      const [p, l, c] = await Promise.all([
        db().from('board_posts').select('*').eq('board_id', r.data.id).order('created_at', { ascending: false }),
        db().from('board_likes').select('post_id,user_id').eq('board_id', r.data.id),
        db().from('board_comments').select('*').eq('board_id', r.data.id).order('created_at'),
      ]);
      if (p.error) throw p.error;
      const list = p.data as Post[]; setPosts(list); setLikes(l.data ?? []); setComments((c.data ?? []) as Cmt[]);
      const missing = list.filter((x) => !urls[x.image_path]).map((x) => x.image_path);
      if (missing.length) {
        const s = await db().storage.from('board').createSignedUrls(missing, 3600);
        setUrls((u) => ({ ...u, ...Object.fromEntries((s.data ?? []).filter((x) => x.signedUrl).map((x) => [x.path, x.signedUrl])) }));
      }
      setErr('');
    } catch (e) { setErr(thaiError(e)); }
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (supabase) load(); }, [load]);
  const bid = b?.id;
  const rt = useRealtime(supabase && bid ? `board-${bid}` : null,
    [{ table: 'board_posts', filter: `board_id=eq.${bid}` }, { table: 'board_likes', filter: `board_id=eq.${bid}` }, { table: 'board_comments', filter: `board_id=eq.${bid}` }], load);

  if (!supabase) return <Page title="บอร์ดโชว์ผลงาน"><SetupRequired /></Page>;
  if (b === undefined) return <Page title="บอร์ดโชว์ผลงาน" bg="board-bg.webp">{err ? <ErrorBox msg={err} onRetry={load} /> : <Spinner />}</Page>;
  if (b === null) return <Page title="บอร์ดโชว์ผลงาน" bg="board-bg.webp"><ErrorBox msg={`ไม่พบบอร์ดรหัส ${code} ตรวจสอบ QR อีกครั้ง`} /></Page>;

  const owner = b.teacher_id === me;
  const author = owner ? 'คุณครู' : name.trim();
  const likeOf = (id: string) => ({ n: likes.filter((x) => x.post_id === id).length, mine: likes.some((x) => x.post_id === id && x.user_id === me) });
  const cmtOf = (id: string) => comments.filter((c) => c.post_id === id);

  async function toggleLike(p: Post) {
    const { mine } = likeOf(p.id);
    setLikes(mine ? likes.filter((x) => !(x.post_id === p.id && x.user_id === me)) : [...likes, { post_id: p.id, user_id: me }]); // optimistic
    const r = mine ? await db().from('board_likes').delete().eq('post_id', p.id).eq('user_id', me)
      : await db().from('board_likes').insert({ post_id: p.id, board_id: b!.id });
    if (r.error) { setErr(thaiError(r.error)); load(); }
  }
  async function act(fn: () => PromiseLike<{ error: unknown }>) { const r = await fn(); if (r.error) setErr(thaiError(r.error)); else load(); }
  async function removePost(p: Post) {
    if (!confirm('ลบผลงานนี้? ย้อนกลับไม่ได้')) return;
    await db().storage.from('board').remove([p.image_path]);
    act(() => db().from('board_posts').delete().eq('id', p.id));
    setBig(null);
  }

  const heart = (p: Post) => (
    <button onClick={() => toggleLike(p)} aria-pressed={likeOf(p.id).mine} aria-label="กดใจ"
      className={`inline-flex min-h-[44px] items-center gap-1 rounded-full px-3 font-bold transition active:scale-90 ${likeOf(p.id).mine ? 'bg-alert text-white' : 'bg-navy/10 text-navy'}`}>
      <Heart size={18} fill={likeOf(p.id).mine ? 'currentColor' : 'none'} aria-hidden /> {likeOf(p.id).n}
    </button>
  );

  return (
    <Page title={b.title} back={owner ? '/boards' : '/hq'} bg="board-bg.webp" right={<ConnectionBadge realtime={rt} />}>
      {err && <div className="mb-4"><ErrorBox msg={err} onRetry={load} /></div>}
      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="space-y-4">
          {owner ? (
            <Card className="space-y-2 text-center">
              <h2 className="font-bold">ให้นักเรียนสแกนเพื่อเข้าบอร์ดนี้</h2>
              <RoomQR code={b.code} path={`/board/${b.code}`} size={200} />
              <Btn className="w-full" onClick={() => setQr(true)}><QrCode size={18} aria-hidden /> แสดง QR เต็มจอ</Btn>
            </Card>
          ) : (
            <PostForm boardId={b.id} name={name} setName={setName} onDone={load} />
          )}
        </div>
        <div>
          {posts.length === 0 ? <div className="rounded-2xl bg-cream/90 p-2"><Empty>ยังไม่มีผลงาน {owner ? 'ให้นักเรียนสแกน QR แล้วส่งรูปใบงาน' : 'ส่งผลงานแรกได้เลย!'}</Empty></div> : (
            <div className="grid gap-6 pt-3 sm:grid-cols-2 xl:grid-cols-3">
              {posts.map((p, k) => (
                <motion.div key={p.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className={`relative bg-cream p-3 pb-3 text-navy shadow-xl ${['rotate-[-1.5deg]', 'rotate-[1deg]', 'rotate-0'][k % 3]} ${p.hidden ? 'opacity-50' : ''}`}>
                  <Art file={PINS[k % 3]} className="absolute -top-4 left-1/2 z-10 h-8 w-8 -translate-x-1/2 object-contain drop-shadow" />
                  <button className="block w-full" onClick={() => setBig(p)} aria-label={`ดูผลงานของ ${p.author}`}>
                    {urls[p.image_path] ? <img src={urls[p.image_path]} alt={`ผลงานของ ${p.author}`} className="aspect-[4/3] w-full object-cover" loading="lazy" />
                      : <div className="grid aspect-[4/3] place-items-center bg-navy/10">กำลังโหลดภาพ…</div>}
                  </button>
                  <div className="mt-2 font-bold">{p.author}{p.hidden && <span className="ml-2 rounded bg-navy/15 px-1 text-xs">ซ่อนอยู่</span>}</div>
                  {p.caption && <p className="line-clamp-2 text-sm">{p.caption}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {heart(p)}
                    <button onClick={() => setBig(p)} className="inline-flex min-h-[44px] items-center gap-1 rounded-full bg-navy/10 px-3 font-bold" aria-label="ความคิดเห็น"><MessageCircle size={18} aria-hidden /> {cmtOf(p.id).length}</button>
                    {owner && <button onClick={() => act(() => db().from('board_posts').update({ hidden: !p.hidden }).eq('id', p.id))} className="grid h-11 w-11 place-items-center rounded-full hover:bg-navy/10" aria-label={p.hidden ? 'แสดงผลงาน' : 'ซ่อนผลงาน'}>{p.hidden ? <Eye size={18} /> : <EyeOff size={18} />}</button>}
                    {(owner || p.user_id === me) && <button onClick={() => removePost(p)} className="grid h-11 w-11 place-items-center rounded-full text-alert hover:bg-alert/10" aria-label="ลบผลงาน"><Trash2 size={18} /></button>}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {qr && (
          <motion.div className="fixed inset-0 z-50 grid place-items-center bg-navy/95 p-4 text-cream" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setQr(false)} role="dialog" aria-modal="true">
            <div className="text-center" onClick={(e) => e.stopPropagation()}>
              <h2 className="mb-4 text-3xl font-bold text-gold">{b.title}</h2>
              <RoomQR code={b.code} path={`/board/${b.code}`} size={Math.min(420, innerHeight - 260)} controls={false} />
              <p className="mt-3 text-xl">สแกนเพื่อส่งรูปใบงานของคุณ แล้วไปกดใจให้เพื่อน!</p>
              <Btn variant="ghost" className="mt-4" onClick={() => setQr(false)}><X aria-hidden /> ปิด</Btn>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {big && (
          <PostView p={big} url={urls[big.image_path]} heart={heart(big)} comments={cmtOf(big.id)} me={me} owner={owner} author={author} needName={!author}
            onClose={() => setBig(null)} onComment={(body) => act(() => db().from('board_comments').insert({ post_id: big.id, board_id: b.id, author, body: body.trim() }))}
            onDelete={(c) => act(() => db().from('board_comments').delete().eq('id', c.id))} />
        )}
      </AnimatePresence>
    </Page>
  );
}

function PostForm({ boardId, name, setName, onDone }: { boardId: string; name: string; setName: (s: string) => void; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [caption, setCaption] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState(false);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function pick(f: File | undefined) {
    setErr(''); setOk(false);
    if (!f) return;
    if (!TYPES.includes(f.type)) { setErr('รองรับเฉพาะรูปภาพ JPG, PNG หรือ WEBP'); return; }
    if (f.size > MAX) { setErr(`ไฟล์ใหญ่เกิน 5 MB (ไฟล์นี้ ${(f.size / 1048576).toFixed(1)} MB)`); return; }
    setFile(f); setPreview(URL.createObjectURL(f));
  }
  async function send() {
    if (!file || !name.trim()) return;
    setErr(''); setProgress(0);
    const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
    const path = `${boardId}/${crypto.randomUUID()}.${ext}`;
    try {
      const { data } = await db().auth.getSession();
      await uploadWithProgress(path, file, data.session!.access_token, setProgress, 'board');
      const r = await db().from('board_posts').insert({ board_id: boardId, author: name.trim(), caption: caption.trim(), image_path: path });
      if (r.error) { await db().storage.from('board').remove([path]); throw r.error; }
      setOk(true); setFile(null); setPreview(''); setCaption(''); onDone();
    } catch (e) { setErr(thaiError(e)); } finally { setProgress(null); }
  }
  return (
    <Card className="space-y-3">
      <h2 className="text-lg font-bold">ส่งรูปใบงานของฉัน</h2>
      <Field label="ชื่อเล่น / เลขที่ (แสดงบนบอร์ด)"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="เช่น 12 มิว" /></Field>
      <Field label="รูปใบงาน (ถ่ายรูปได้เลย ไม่เกิน 5 MB)">
        <input type="file" accept="image/jpeg,image/png,image/webp" className="block w-full text-sm file:mr-3 file:min-h-[44px] file:rounded-lg file:border-0 file:bg-dblue file:px-4 file:text-cream" onChange={(e) => pick(e.target.files?.[0])} />
      </Field>
      {preview && <img src={preview} alt="ตัวอย่างภาพก่อนส่ง" className="max-h-56 w-full rounded object-contain ring-1 ring-navy/10" />}
      <Field label="อธิบายสั้น ๆ (ไม่บังคับ)"><textarea className={inputCls} rows={2} maxLength={300} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="เช่น ข้อมูลมีค่าผิดปกติ จึงใช้มัธยฐาน" /></Field>
      {progress !== null && <div className="h-3 overflow-hidden rounded-full bg-navy/10" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div className="h-full bg-teal transition-all" style={{ width: `${progress}%` }} /></div>}
      <Btn className="w-full" onClick={send} disabled={!file || !name.trim() || progress !== null}><Upload size={18} aria-hidden /> {progress !== null ? `กำลังอัปโหลด ${progress}%` : 'ติดผลงานบนบอร์ด'}</Btn>
      {!name.trim() && file && <p className="text-sm text-alert">ใส่ชื่อเล่นหรือเลขที่ก่อนส่ง</p>}
      {ok && <p className="rounded-lg bg-teal/15 p-2 text-teal">ติดผลงานบนบอร์ดแล้ว!</p>}
      {err && <ErrorBox msg={err} onRetry={file ? send : undefined} />}
    </Card>
  );
}

function PostView({ p, url, heart, comments, me, owner, author, needName, onClose, onComment, onDelete }: {
  p: Post; url?: string; heart: React.ReactNode; comments: Cmt[]; me: string; owner: boolean; author: string; needName: boolean;
  onClose: () => void; onComment: (body: string) => Promise<void>; onDelete: (c: Cmt) => void;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  async function send() { if (!text.trim() || needName) return; setBusy(true); await onComment(text); setText(''); setBusy(false); }
  return (
    <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" onClick={onClose}>
      <div className="max-h-full w-full max-w-4xl overflow-auto rounded-xl bg-cream p-4 text-navy" onClick={(e) => e.stopPropagation()}>
        <button autoFocus onClick={onClose} className="mb-2 inline-flex min-h-[44px] items-center gap-1 font-semibold"><X aria-hidden /> ปิด</button>
        {url && <img src={url} alt={`ผลงานของ ${p.author}`} className="max-h-[60vh] w-full object-contain" />}
        <h3 className="mt-3 text-xl font-bold">{p.author}</h3>
        {p.caption && <p className="mt-1">{p.caption}</p>}
        <div className="mt-2">{heart}</div>
        <section className="mt-4 border-t border-navy/10 pt-3" aria-label="ความคิดเห็น">
          <h4 className="mb-2 font-bold">ความคิดเห็น ({comments.length})</h4>
          <ul className="space-y-2">
            {comments.map((c) => (
              <li key={c.id} className="flex items-start gap-2 rounded-lg bg-white p-2 shadow-sm">
                <div className="flex-1"><b className="text-teal">{c.author}</b> <span className="text-xs opacity-60">{new Date(c.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span><p>{c.body}</p></div>
                {(owner || c.user_id === me) && <button onClick={() => onDelete(c)} className="grid h-11 w-11 place-items-center rounded-full hover:bg-alert/10" aria-label="ลบความคิดเห็น"><Trash2 size={16} aria-hidden /></button>}
              </li>
            ))}
            {comments.length === 0 && <li className="opacity-60">ยังไม่มีความคิดเห็น เป็นคนแรกที่ชมผลงานนี้!</li>}
          </ul>
          {needName ? <p className="mt-3 rounded-lg bg-gold/25 p-2 text-sm">ใส่ชื่อเล่นในช่อง “ชื่อเล่น / เลขที่” ก่อน จึงจะคอมเมนต์ได้</p> : (
            <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
              <input className={inputCls} value={text} onChange={(e) => setText(e.target.value)} maxLength={300} placeholder={`คอมเมนต์ในชื่อ ${author}`} aria-label="เขียนความคิดเห็น" />
              <Btn disabled={busy || !text.trim()} aria-label="ส่งความคิดเห็น"><Send size={18} aria-hidden /></Btn>
            </form>
          )}
        </section>
      </div>
    </motion.div>
  );
}
