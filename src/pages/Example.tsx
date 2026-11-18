import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Store } from 'lucide-react';
import { Btn, Page } from '../components/ui';
import { Art } from '../components/art';

// Engagement step: the poster is computed correctly (mean = 30,200) but misleads. No measure is named here on purpose.
const STAFF = [
  { who: 'พนักงาน A', pay: 12000 }, { who: 'พนักงาน B', pay: 12000 }, { who: 'พนักงาน C', pay: 13000 },
  { who: 'พนักงาน D', pay: 14000 }, { who: 'พนักงาน E (เจ้าของร้าน)', pay: 100000 },
];
const baht = (n: number) => n.toLocaleString('th-TH');

export default function Example() {
  const [data, setData] = useState(false);
  return (
    <Page title="ตัวอย่างที่ 1 · โปสเตอร์รับสมัครพนักงาน" back="/hq" dark>
      {/* one screen, no scrolling: the poster takes the full height, the side column stays compact */}
      <div className="flex h-[calc(100dvh-6.5rem)] items-stretch gap-5">
        {/* poster: art has no text, the Thai headline is real text so it is always sharp and correct */}
        <motion.div initial={{ rotate: -2, y: 20, opacity: 0 }} animate={{ rotate: -1.5, y: 0, opacity: 1 }}
          style={{ width: 'min(calc((100dvh - 6.5rem) * 0.75), 48vw)' }} className="relative h-full shrink-0 overflow-hidden rounded-lg bg-[#f4e3c3] shadow-2xl ring-8 ring-[#7a4b25]">
          <Art file="poster-bg.webp" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-[#3b2414]/90 via-[#3b2414]/60 to-transparent px-4 pb-10 pt-5 text-center text-[#fff3dc]">
            <p className="text-2xl font-black tracking-wide drop-shadow sm:text-4xl">ร้านกาแฟก้นแก้ว</p>
            <p className="mt-1 text-xl font-bold sm:text-3xl">รับสมัครพนักงาน</p>
          </div>
          <div className="absolute inset-x-3 bottom-4 rotate-[-2deg] rounded-2xl bg-[#c8323c] p-3 text-center text-white shadow-xl ring-4 ring-[#fff3dc] sm:p-4">
            <p className="text-lg font-bold sm:text-2xl">เงินเดือนเฉลี่ย</p>
            <p className="font-num text-5xl font-black leading-tight sm:text-7xl">30,200</p>
            <p className="text-xl font-bold sm:text-2xl">บาท !</p>
          </div>
        </motion.div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          <div className="rounded-2xl bg-cream p-4 text-navy shadow-lg">
            <p className="text-sm font-bold tracking-widest text-alert">คำถามชวนคิด</p>
            <p className="mt-1 text-2xl font-bold">ถ้าเราจะไปสมัครงาน นักเรียนจะเชื่อตัวเลขนี้ไหม เพราะอะไร?</p>
          </div>
          {!data && <Btn className="w-full text-xl" onClick={() => setData(true)}><Store aria-hidden /> ดูข้อมูลร้าน</Btn>}
          <AnimatePresence>
            {data && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="min-h-0 rounded-2xl bg-white p-4 text-navy shadow-lg">
                <h2 className="mb-2 text-xl font-bold">เงินเดือนพนักงานทั้งหมดของร้านกาแฟก้นแก้ว (5 คน)</h2>
                <ul className="space-y-1.5">
                  {STAFF.map((s, i) => (
                    <motion.li key={s.who} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.25 }} className="grid grid-cols-[minmax(0,10rem)_1fr] items-center gap-3">
                      <span className="font-semibold">{s.who}</span>
                      <span className="flex items-center gap-2">
                        <motion.span initial={{ width: 0 }} animate={{ width: `${(s.pay / 100000) * 70}%` }} transition={{ delay: i * 0.25 + 0.2, duration: 0.6 }}
                          className={`block h-7 min-w-[6px] rounded ${s.pay > 50000 ? 'bg-alert' : 'bg-teal'}`} />
                        <b className="whitespace-nowrap font-num text-lg">{baht(s.pay)}</b>
                      </span>
                    </motion.li>
                  ))}
                </ul>
                <div className="mt-3 space-y-1 rounded-xl bg-gold/20 p-3 text-lg font-semibold">
                  <p>คิดว่าเงินเดือนพนักงานส่วนใหญ่น่าจะประมาณเท่าไร?</p>
                  <p>ตัวเลข 30,200 คำนวณถูกต้อง แต่ทำไมถึงทำให้เข้าใจผิด?</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Page>
  );
}
