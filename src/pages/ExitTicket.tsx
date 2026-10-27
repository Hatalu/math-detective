import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Circle } from 'lucide-react';
import { Btn, Card, ConnectionBadge, ErrorBox, Field, Page, SetupRequired, inputCls, useOnline } from '../components/ui';
import { submitExit } from '../lib/api';
import { db, ensureStudentSession, supabase, thaiError } from '../lib/supabase';

const QUESTIONS = [
  'หากข้อมูลมีค่าสุดโต่ง มัธยฐานอาจเหมาะกว่าค่าเฉลี่ยในกรณีใด เพราะเหตุใด?',
  'หากร้านค้าต้องการทราบสินค้าที่ขายบ่อยที่สุด ควรเลือกค่ากลางใด?',
  'ยกตัวอย่างสถานการณ์ที่การรายงานค่าเฉลี่ยอย่างเดียวอาจทำให้เข้าใจข้อมูลผิดไปจากบริบท',
];
const FEEDBACK = [
  'แนวคำตอบ: เมื่อต้องการบอกค่าที่เป็นตัวแทนของข้อมูลส่วนใหญ่ เช่น รายได้ของคนทั่วไป เพราะมัธยฐานขึ้นกับตำแหน่งตรงกลาง จึงไม่ถูกดึงด้วยค่าสุดโต่งมาก แต่ถ้าต้องการผลรวม ค่าเฉลี่ยยังจำเป็น',
  'แนวคำตอบ: ฐานนิยม เพราะเป็นค่าที่มีความถี่สูงสุด และใช้ได้แม้ข้อมูลเป็นประเภท/ขนาดสินค้า',
  'แนวคำตอบ: เช่น เงินเดือนในบริษัทที่ผู้บริหารได้สูงมาก ค่าเฉลี่ยจะสูงกว่าที่พนักงานส่วนใหญ่ได้จริง ควรรายงานมัธยฐานหรือการกระจายของข้อมูลประกอบ',
];

// Individual answers (one per device/anonymous user), stored apart from team game scores.
export default function ExitTicket() {
  const { sid = '' } = useParams();
  const online = useOnline();
  const [label, setLabel] = useState('');
  const [a, setA] = useState<[string, string, string]>(['', '', '']);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    (async () => {
      try {
        await ensureStudentSession();
        const { data: u } = await supabase!.auth.getUser();
        const r = await db().from('exit_ticket_responses').select('*').eq('session_id', sid).eq('user_id', u.user!.id).maybeSingle();
        if (r.data) { setLabel(r.data.student_label); setA([r.data.answer1, r.data.answer2, r.data.answer3]); setDone(true); }
      } catch (e) { setErr(thaiError(e)); }
    })();
  }, [sid]);

  if (!supabase) return <Page title="Exit Ticket"><SetupRequired /></Page>;
  const complete = a.every((x) => x.trim().length > 0);

  async function send() {
    setErr(''); setBusy(true);
    try { await submitExit(sid, label, a); setDone(true); } catch (e) { setErr(thaiError(e)); } finally { setBusy(false); }
  }

  return (
    <Page title="Exit Ticket ท้ายคาบ (รายบุคคล)" right={<ConnectionBadge />}>
      <Card className="mx-auto max-w-2xl space-y-4">
        <p className="text-sm opacity-75">คำตอบนี้เป็นของแต่ละคน ไม่นับรวมกับคะแนนทีม ถ้าใช้โทรศัพท์ร่วมกัน ให้แต่ละคนตอบจากเครื่องของตัวเอง</p>
        <Field label="เลขที่ หรือชื่อเล่นที่ครูกำหนด"><input className={inputCls} maxLength={40} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="เช่น เลขที่ 12" /></Field>
        {QUESTIONS.map((q, k) => (
          <div key={k}>
            <Field label={`ข้อ ${k + 1}: ${q}`}>
              <textarea className={inputCls} rows={3} maxLength={1000} value={a[k]} onChange={(e) => { const n = [...a] as typeof a; n[k] = e.target.value; setA(n); }} />
            </Field>
            {done && <p className="mt-1 rounded-lg bg-teal/10 p-2 text-sm text-teal">{FEEDBACK[k]}</p>}
          </div>
        ))}
        <ul className="flex flex-wrap gap-3 text-sm" aria-label="สถานะการตอบ">
          {a.map((x, k) => <li key={k} className="flex items-center gap-1">{x.trim() ? <CheckCircle2 size={16} className="text-teal" aria-hidden /> : <Circle size={16} aria-hidden />} ข้อ {k + 1} {x.trim() ? 'ตอบแล้ว' : 'ยังไม่ตอบ'}</li>)}
        </ul>
        <Btn className="w-full" onClick={send} disabled={busy || !online || !label.trim() || !complete}>{busy ? 'กำลังส่ง…' : done ? 'ส่งคำตอบที่แก้ไข' : 'ส่ง Exit Ticket'}</Btn>
        {!complete && <p className="text-sm opacity-70">ตอบให้ครบ 3 ข้อก่อนส่ง</p>}
        {done && !busy && <p className="rounded-lg bg-teal/15 p-2 font-semibold text-teal">บันทึกในระบบแล้ว อ่านแนวคำตอบใต้แต่ละข้อเพื่อทบทวน</p>}
        {err && <ErrorBox msg={err} onRetry={online ? send : undefined} />}
      </Card>
    </Page>
  );
}
