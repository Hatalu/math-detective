import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, Copy, Dices, Eye, FileDown, FileUp, Plus, Save, Trash2, X } from 'lucide-react';
import { Btn, Card, ErrorBox, Field, Page, Spinner, inputCls } from '../components/ui';
import { Investigation } from '../components/Investigation';
import { TeacherGate } from './Teacher';
import { loadSet, saveQuestion } from '../lib/api';
import { answerKey, DEFAULT_CASES, type CaseQuestion, type EvidenceKind } from '../lib/cases';
import { fillTemplate, fmt, generateDataset, MEASURE_TH, parseDataText, type Measure } from '../lib/math';
import { db, thaiError } from '../lib/supabase';

const BLANK: CaseQuestion = {
  code: 'CASE 09', title: 'คดีใหม่', story: '', objective: '', evidence: [{ kind: 'document', title: 'หลักฐานชิ้นที่ 1', body: '' }],
  data: [10, 12, 12, 15, 18], dataLabel: 'ข้อมูล', unit: '', prompt: '', target: 'choose', askValue: true, difficulty: 1, measure: 'mode',
  clues: ['ลองดูว่าคำถามต้องการทราบอะไรเกี่ยวกับข้อมูลชุดนี้', 'ลองนับความถี่ของแต่ละค่า', 'ค่าที่ปรากฏ {modecount} ครั้งคือ {modes}'],
  reasoning: '', misconceptions: '', limitations: '',
};

function validate(q: CaseQuestion): string[] {
  const e: string[] = [];
  if (!q.title.trim()) e.push('ใส่ชื่อคดี');
  if (!q.prompt.trim()) e.push('ใส่คำถาม');
  if (q.data.length < 2) e.push('ชุดข้อมูลต้องมีอย่างน้อย 2 ค่า');
  if (q.target !== 'choose' && q.target !== q.measure) e.push('ค่ากลางที่โจทย์กำหนดต้องตรงกับค่ากลางที่เป็นคำตอบ');
  if (q.clues.some((c) => !c.trim())) e.push('ใส่คำใบ้ให้ครบ 3 ระดับ');
  return e;
}

function EditorBody({ uid }: { uid: string }) {
  const { setId } = useParams();
  const nav = useNavigate();
  const [title, setTitle] = useState('ชุดโจทย์ใหม่');
  const [qs, setQs] = useState<CaseQuestion[] | null>(setId ? null : [structuredClone(BLANK)]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [sel, setSel] = useState(0);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (!setId) return;
    (async () => {
      try {
        const s = await db().from('question_sets').select('title').eq('id', setId).single();
        if (s.error) throw s.error;
        setTitle(s.data.title); setQs(await loadSet(setId));
      } catch (e) { setErr(thaiError(e)); }
    })();
  }, [setId]);

  if (!qs) return <Page title="แก้ไขโจทย์" back="/teacher">{err ? <ErrorBox msg={err} /> : <Spinner />}</Page>;
  const q = qs[sel] ?? qs[0];
  const patch = (p: Partial<CaseQuestion>) => setQs(qs.map((x, i) => (i === sel ? { ...x, ...p } : x)));
  const move = (d: number) => { const j = sel + d; if (j < 0 || j >= qs.length) return; const n = [...qs]; [n[sel], n[j]] = [n[j], n[sel]]; setQs(n); setSel(j); };

  async function save() {
    setErr(''); setMsg('');
    const bad = qs!.map((x, i) => ({ i, e: validate(x) })).find((x) => x.e.length);
    if (bad) { setSel(bad.i); setErr(`ข้อ ${bad.i + 1}: ${bad.e.join(', ')}`); return; }
    setBusy(true);
    try {
      let id = setId;
      if (!id) {
        const r = await db().from('question_sets').insert({ teacher_id: uid, title }).select('id').single();
        if (r.error) throw r.error; id = r.data.id;
      } else {
        const r = await db().from('question_sets').update({ title, updated_at: new Date().toISOString() }).eq('id', id);
        if (r.error) throw r.error;
      }
      if (removed.length) { const r = await db().from('questions').delete().in('id', removed); if (r.error) throw r.error; }
      const ids: string[] = [];
      for (let i = 0; i < qs!.length; i++) ids.push(await saveQuestion(id!, i, qs![i]));
      setQs(qs!.map((x, i) => ({ ...x, id: ids[i] }))); setRemoved([]);
      setMsg('บันทึกแล้ว');
      if (!setId) nav(`/teacher/editor/${id}`, { replace: true });
    } catch (e) { setErr(thaiError(e)); } finally { setBusy(false); }
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify({ title, questions: qs!.map(({ id: _id, ...rest }) => rest) }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${title}.json`; a.click();
  }
  function importJSON(f?: File) {
    if (!f) return;
    f.text().then((t) => {
      try {
        const j = JSON.parse(t);
        const list = (Array.isArray(j) ? j : j.questions) as CaseQuestion[];
        if (!Array.isArray(list) || !list.length) throw new Error('ไม่พบรายการโจทย์ในไฟล์');
        list.forEach((x, i) => { parseDataText(x.data.join(',')); if (!x.title || !x.measure || x.clues?.length !== 3) throw new Error(`โจทย์ข้อ ${i + 1} ข้อมูลไม่ครบ`); });
        if (j.title) setTitle(j.title);
        setRemoved([...removed, ...qs!.filter((x) => x.id).map((x) => x.id!)]);
        setQs(list.map(({ id: _id, ...x }) => x)); setSel(0); setMsg('นำเข้าแล้ว กด “บันทึก” เพื่อเก็บลงฐานข้อมูล');
      } catch (e) { setErr('ไฟล์ JSON ไม่ถูกต้อง: ' + (e as Error).message); }
    });
  }

  return (
    <Page title="Question Editor" back="/teacher">
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <div className="min-w-[220px] flex-1"><Field label="ชื่อชุดโจทย์"><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} /></Field></div>
        <Btn onClick={save} disabled={busy}><Save size={18} aria-hidden /> {busy ? 'กำลังบันทึก…' : 'บันทึก'}</Btn>
        <Btn variant="navy" onClick={exportJSON}><FileDown size={18} aria-hidden /> Export JSON</Btn>
        <label className="inline-flex min-h-[48px] cursor-pointer items-center gap-2 rounded-xl bg-dblue px-5 font-semibold text-cream"><FileUp size={18} aria-hidden /> Import JSON
          <input type="file" accept="application/json,.json" className="sr-only" onChange={(e) => importJSON(e.target.files?.[0])} /></label>
      </div>
      {err && <div className="mb-3"><ErrorBox msg={err} /></div>}
      {msg && <p className="mb-3 rounded-lg bg-teal/15 p-2 text-teal">{msg}</p>}

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <Card className="h-fit">
          <ol className="space-y-1">
            {qs.map((x, i) => (
              <li key={i}><button onClick={() => setSel(i)} className={`min-h-[44px] w-full rounded-lg px-3 text-left ${i === sel ? 'bg-gold/30 font-bold' : 'hover:bg-navy/5'}`}>{i + 1}. {x.title}{validate(x).length ? ' ⚠' : ''}</button></li>
            ))}
          </ol>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Btn variant="teal" onClick={() => { setQs([...qs, { ...structuredClone(BLANK), code: `CASE ${String(qs.length + 1).padStart(2, '0')}` }]); setSel(qs.length); }}><Plus size={16} aria-hidden /> เพิ่ม</Btn>
            <Btn variant="ghost" onClick={() => { const c = structuredClone(q); delete c.id; setQs([...qs, c]); setSel(qs.length); }}><Copy size={16} aria-hidden /> ทำซ้ำ</Btn>
            <Btn variant="ghost" onClick={() => move(-1)} aria-label="เลื่อนขึ้น"><ArrowUp size={16} aria-hidden /></Btn>
            <Btn variant="ghost" onClick={() => move(1)} aria-label="เลื่อนลง"><ArrowDown size={16} aria-hidden /></Btn>
            <Btn variant="danger" className="col-span-2" disabled={qs.length < 2} onClick={() => { if (!confirm('ลบโจทย์นี้?')) return; if (q.id) setRemoved([...removed, q.id]); setQs(qs.filter((_, i) => i !== sel)); setSel(0); }}><Trash2 size={16} aria-hidden /> ลบโจทย์</Btn>
          </div>
          <details className="mt-3 text-sm"><summary className="cursor-pointer font-semibold">ใช้คดีจากคลังเริ่มต้น</summary>
            {DEFAULT_CASES.map((c) => <button key={c.code} className="block min-h-[40px] w-full text-left hover:underline" onClick={() => { setQs([...qs, structuredClone(c)]); setSel(qs.length); }}>+ {c.code} {c.title}</button>)}
          </details>
        </Card>
        <QuestionForm q={q} patch={patch} onPreview={() => setPreview(true)} />
      </div>
      {preview && <Preview q={q} onClose={() => setPreview(false)} />}
    </Page>
  );
}

function QuestionForm({ q, patch, onPreview }: { q: CaseQuestion; patch: (p: Partial<CaseQuestion>) => void; onPreview: () => void }) {
  const [dataText, setDataText] = useState(q.data.join(', '));
  const [dataErr, setDataErr] = useState('');
  const [rnd, setRnd] = useState({ count: 9, min: 1, max: 20, shape: 'any' as 'any' | 'single' | 'multi' | 'none' });
  useEffect(() => { setDataText(q.data.join(', ')); setDataErr(''); }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  const key = useMemo(() => { try { return answerKey(q); } catch { return null; } }, [q]);
  const t = (k: keyof CaseQuestion, label: string, rows = 0) => (
    <Field label={label}>{rows ? <textarea className={inputCls} rows={rows} value={q[k] as string} onChange={(e) => patch({ [k]: e.target.value })} />
      : <input className={inputCls} value={q[k] as string} onChange={(e) => patch({ [k]: e.target.value })} />}</Field>
  );

  return (
    <div className="space-y-4">
      <Card className="grid gap-3 sm:grid-cols-2">
        {t('code', 'รหัสคดี')}{t('title', 'ชื่อคดี')}
        <div className="sm:col-span-2">{t('story', 'สถานการณ์ (Case Brief)', 3)}</div>
        <div className="sm:col-span-2">{t('objective', 'ภารกิจ (Mission Objective)')}</div>
        <div className="sm:col-span-2">{t('prompt', 'คำถาม')}</div>
        <Field label="ค่ากลางที่เป็นคำตอบ">
          <select className={inputCls} value={q.measure} onChange={(e) => { const m = e.target.value as Measure; patch({ measure: m, target: q.target === 'choose' ? 'choose' : m }); }}>
            {(['mean', 'median', 'mode'] as Measure[]).map((m) => <option key={m} value={m}>{MEASURE_TH[m]}</option>)}
          </select>
        </Field>
        <Field label="รูปแบบคำถาม">
          <select className={inputCls} value={q.target === 'choose' ? 'choose' : 'fixed'} onChange={(e) => patch({ target: e.target.value === 'choose' ? 'choose' : q.measure })}>
            <option value="choose">นักเรียนต้องเลือกค่ากลางเอง</option><option value="fixed">กำหนดค่ากลางให้ (คำนวณอย่างเดียว)</option>
          </select>
        </Field>
        <Field label="ระดับความยาก"><select className={inputCls} value={q.difficulty} onChange={(e) => patch({ difficulty: Number(e.target.value) as 1 | 2 | 3 })}><option value={1}>ง่าย</option><option value={2}>กลาง</option><option value={3}>ท้าทาย</option></select></Field>
        <label className="flex min-h-[44px] items-center gap-2 self-end"><input type="checkbox" className="h-5 w-5" checked={q.askValue} onChange={(e) => patch({ askValue: e.target.checked })} /> ต้องตอบค่าตัวเลขด้วย</label>
      </Card>

      <Card>
        <h3 className="mb-2 font-bold">ชุดข้อมูล</h3>
        <div className="grid gap-3 sm:grid-cols-2">{t('dataLabel', 'ข้อมูลคืออะไร')}{t('unit', 'หน่วย')}</div>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border-2 border-teal/30 p-3">
            <h4 className="mb-2 font-semibold text-teal">กำหนดเอง</h4>
            <textarea className={`${inputCls} font-num`} rows={2} value={dataText} onChange={(e) => setDataText(e.target.value)} placeholder="เช่น 12, 15, 15, 18" />
            <Btn variant="teal" className="mt-2" onClick={() => { try { patch({ data: parseDataText(dataText) }); setDataErr(''); } catch (e) { setDataErr((e as Error).message); } }}>ใช้ชุดข้อมูลนี้</Btn>
          </div>
          <div className="rounded-xl border-2 border-gold/50 p-3">
            <h4 className="mb-2 font-semibold">Random</h4>
            <div className="grid grid-cols-3 gap-2">
              <Field label="จำนวน"><input type="number" className={inputCls} value={rnd.count} onChange={(e) => setRnd({ ...rnd, count: Number(e.target.value) })} /></Field>
              <Field label="ต่ำสุด"><input type="number" className={inputCls} value={rnd.min} onChange={(e) => setRnd({ ...rnd, min: Number(e.target.value) })} /></Field>
              <Field label="สูงสุด"><input type="number" className={inputCls} value={rnd.max} onChange={(e) => setRnd({ ...rnd, max: Number(e.target.value) })} /></Field>
            </div>
            <Field label="ลักษณะฐานนิยม"><select className={inputCls} value={rnd.shape} onChange={(e) => setRnd({ ...rnd, shape: e.target.value as typeof rnd.shape })}>
              <option value="any">ไม่กำหนด</option><option value="single">มีฐานนิยม 1 ค่า</option><option value="multi">มีหลายฐานนิยม</option><option value="none">ไม่มีฐานนิยม</option></select></Field>
            <Btn className="mt-2" onClick={() => { try { const d = generateDataset({ count: rnd.count, min: rnd.min, max: rnd.max, modeShape: rnd.shape }); patch({ data: d }); setDataErr(''); } catch (e) { setDataErr((e as Error).message); } }}><Dices size={18} aria-hidden /> สุ่มชุดข้อมูล</Btn>
          </div>
        </div>
        {dataErr && <div className="mt-2"><ErrorBox msg={dataErr} /></div>}
        <p className="mt-3 font-num">ข้อมูลที่ใช้: {q.data.map(fmt).join(', ')}</p>
        {key && <p className="mt-1 rounded-lg bg-gold/20 p-2">เฉลยคำนวณจากข้อมูลจริง: <b>{MEASURE_TH[key.measure]} = {key.noMode ? 'ไม่มีฐานนิยม' : key.values.map(fmt).join(' และ ')}</b>
          <span className="block text-sm">{key.steps.join(' → ')}</span></p>}
      </Card>

      <Card>
        <h3 className="mb-2 font-bold">หลักฐาน</h3>
        {q.evidence.map((ev, i) => (
          <div key={i} className="mb-3 grid gap-2 rounded-lg bg-navy/5 p-2 sm:grid-cols-[140px_1fr_auto]">
            <select className={inputCls} value={ev.kind} onChange={(e) => patch({ evidence: q.evidence.map((x, j) => (j === i ? { ...x, kind: e.target.value as EvidenceKind } : x)) })}>
              <option value="document">เอกสาร</option><option value="photo">ภาพถ่าย</option><option value="slip">ใบเสร็จ/สลิป</option><option value="note">บันทึก</option>
            </select>
            <input className={inputCls} value={ev.title} placeholder="ชื่อหลักฐาน" onChange={(e) => patch({ evidence: q.evidence.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} />
            <button className="grid h-11 w-11 place-items-center rounded-lg text-alert hover:bg-alert/10" aria-label="ลบหลักฐาน" onClick={() => patch({ evidence: q.evidence.filter((_, j) => j !== i) })}><Trash2 size={18} aria-hidden /></button>
            <textarea className={`${inputCls} sm:col-span-3`} rows={2} value={ev.body} placeholder="รายละเอียด" onChange={(e) => patch({ evidence: q.evidence.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)) })} />
          </div>
        ))}
        <Btn variant="ghost" onClick={() => patch({ evidence: [...q.evidence, { kind: 'note', title: 'หลักฐานใหม่', body: '' }] })}><Plus size={16} aria-hidden /> เพิ่มหลักฐาน</Btn>
      </Card>

      <Card>
        <h3 className="mb-1 font-bold">คำใบ้ 3 ระดับ</h3>
        <p className="mb-2 text-sm opacity-70">ใช้ตัวแปรเพื่อให้คำใบ้ตรงกับข้อมูลเสมอ: {'{n} {sum} {mean} {median} {modes} {modecount} {sorted} {middle} {min} {max}'}</p>
        {q.clues.map((c, i) => (
          <div key={i} className="mb-3">
            <Field label={`ระดับ ${i + 1} — ${['สังเกตหลักฐาน', 'เชื่อมโยงข้อมูล', 'แนวทางแก้ (ห้ามเฉลยตรง ๆ)'][i]}`}>
              <textarea className={inputCls} rows={2} value={c} onChange={(e) => { const n = [...q.clues] as CaseQuestion['clues']; n[i] = e.target.value; patch({ clues: n }); }} />
            </Field>
            <p className="text-sm text-teal">นักเรียนจะเห็น: {fillTemplate(c, q.data)}</p>
          </div>
        ))}
      </Card>

      <Card className="space-y-3">
        {t('reasoning', 'คำอธิบายเหตุผล (แสดงหลังส่งคำตอบ)', 3)}
        {t('misconceptions', 'ข้อผิดพลาดที่นักเรียนมักทำ', 2)}
        {t('limitations', 'ข้อจำกัดของค่ากลางนี้', 2)}
        <p className="text-sm opacity-70">เกณฑ์คะแนน: ถูกต้อง 50 · วิธีคำนวณ/ตรวจหลักฐาน 20 · เหตุผล 25 · สื่อสารในทีม 5 (ครูให้) · หักคำใบ้ตามที่ตั้งในห้อง</p>
        <Btn variant="navy" onClick={onPreview}><Eye size={18} aria-hidden /> Preview มุมมองนักเรียน</Btn>
      </Card>
    </div>
  );
}

function Preview({ q, onClose }: { q: CaseQuestion; onClose: () => void }) {
  const [lv, setLv] = useState(0);
  const [res, setRes] = useState('');
  const [dk] = useState(() => `preview:${Date.now()}`);
  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-cream p-4" role="dialog" aria-modal="true">
      <div className="mb-3 flex items-center gap-2"><h2 className="flex-1 text-xl font-bold">Preview (ไม่บันทึกผล)</h2><Btn variant="navy" onClick={onClose}><X aria-hidden /> ปิด</Btn></div>
      {res && <p className="mb-3 rounded-lg bg-gold/30 p-2">{res}</p>}
      <Investigation q={q} draftKey={dk} hints={{ levels: q.clues.slice(0, lv).map((c, i) => ({ level: i + 1, body: fillTemplate(c, q.data) })), enabled: true, penalty: 5 }}
        onRevealHint={async (l) => setLv(l)} locked={false} hunt={false}
        onSubmit={async (a) => { const k = answerKey(q); setRes(`ส่งทดสอบ: เลือก ${a.measure ? MEASURE_TH[a.measure] : '-'} = ${a.noMode ? 'ไม่มีฐานนิยม' : a.values.join(', ')} · เฉลย ${MEASURE_TH[k.measure]} = ${k.noMode ? 'ไม่มีฐานนิยม' : k.values.map(fmt).join(', ')}`); }} />
    </div>
  );
}

export default function Editor() {
  return <TeacherGate title="Question Editor" back="/teacher">{(uid) => <EditorBody uid={uid} />}</TeacherGate>;
}
