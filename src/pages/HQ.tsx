import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Film, Presentation, QrCode, Settings, ShieldCheck } from 'lucide-react';
import { HQScene } from '../components/cinema';
import { Art } from '../components/art';
import { Cody, OutlierShadow } from '../components/characters';
import { supabase } from '../lib/supabase';

const items = [
  { to: '/join', icon: QrCode, title: 'เข้าห้องสืบสวน', sub: 'สำหรับนักเรียน: ใส่รหัสห้องหรือสแกน QR' },
  { to: '/practice', icon: BookOpen, title: 'โหมดฝึกสืบสวน', sub: 'เล่น 8 คดีบนเครื่องนี้ ไม่ต้องใช้ห้อง' },
  { to: '/teach', icon: Presentation, title: 'โหมดครูผู้สอน', sub: 'กระดานสอนค่ากลาง เขียน/วาดได้ จับเวลา สุ่มเลขที่' },
  { to: '/teacher', icon: ShieldCheck, title: 'ศูนย์ควบคุมครู', sub: 'สร้างห้อง QR โจทย์ คะแนน รายงาน' },
  { to: '/', icon: Film, title: 'ดูฉากเปิดอีกครั้ง', sub: 'Cinematic Intro' },
  { to: '/settings', icon: Settings, title: 'ตั้งค่า', sub: 'แอนิเมชัน ความเร็ว เสียง' },
];

export default function HQ() {
  return (
    <div className="relative min-h-dvh overflow-hidden text-cream">
      <div className="fixed inset-0"><HQScene camX={-30} /></div>
      <div className="relative z-10 mx-auto flex min-h-dvh max-w-6xl flex-col justify-center gap-6 px-4 py-8 sm:px-8 lg:flex-row lg:items-center">
        <div className="lg:w-1/2">
          <Art file="ui-logo.webp" className="mb-2 h-20 w-20 object-contain drop-shadow-lg" />
          <p className="tracking-[.3em] text-gold">DETECTIVE HQ</p>
          <h1 className="mb-2 text-4xl font-bold drop-shadow-lg sm:text-5xl">สำนักงานนักสืบ<br />แห่งนครข้อมูล</h1>
          <p className="max-w-md text-lg opacity-90">เลือกภารกิจของคุณ นักสืบฝึกหัด</p>
          {!supabase && <p className="mt-3 inline-block rounded-lg bg-alert/80 px-3 py-1 text-sm">ยังไม่ได้ตั้งค่าฐานข้อมูล: ใช้ได้เฉพาะโหมดฝึก</p>}
          <div className="mt-6 hidden h-32 gap-4 sm:flex"><div className="w-28"><Cody /></div><div className="w-24"><OutlierShadow /></div></div>
        </div>
        <nav className="grid gap-3 lg:w-1/2" aria-label="เมนูหลัก">
          {items.map(({ to, icon: Icon, title, sub }, k) => (
            <motion.div key={title} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: k * 0.07 }}>
              <Link to={to} className="flex min-h-[64px] items-center gap-4 rounded-2xl bg-navy/75 p-4 ring-1 ring-gold/30 backdrop-blur transition hover:bg-dblue/90 hover:ring-gold">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gold text-navy"><Icon aria-hidden /></span>
                <span><span className="block text-lg font-bold">{title}</span><span className="text-sm opacity-80">{sub}</span></span>
              </Link>
            </motion.div>
          ))}
        </nav>
      </div>
    </div>
  );
}
