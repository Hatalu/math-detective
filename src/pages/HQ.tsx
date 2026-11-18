import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Coffee, Film, Images, Users } from 'lucide-react';
import { HQScene } from '../components/cinema';
import { Art } from '../components/art';

// One lesson, one path: the four buttons follow the 5E order of the lesson plan, top to bottom.
const items = [
  { to: '/', icon: Film, title: 'ฉากเปิด', sub: 'เล่นฉากเปิดคดีอีกครั้ง' },
  { to: '/example', icon: Coffee, title: 'ตัวอย่างที่ 1', sub: 'โปสเตอร์รับสมัครพนักงาน ร้านกาแฟก้นแก้ว' },
  { to: '/teacher', icon: Users, title: 'กิจกรรมทีม', sub: 'สร้างห้อง สร้างทีม พิมพ์ QR · CASE 01, 02, 03' },
  { to: '/boards', icon: Images, title: 'บอร์ดโชว์ผลงาน', sub: 'นักเรียนสแกน QR อัปโหลดรูปใบงานของทีม' },
];

export default function HQ() {
  return (
    <div className="relative min-h-dvh overflow-hidden text-cream">
      <div className="fixed inset-0"><HQScene camX={-30} /></div>
      <div className="relative z-10 mx-auto flex min-h-dvh max-w-6xl flex-col justify-center gap-6 px-4 py-8 sm:px-8 lg:flex-row lg:items-center">
        <div className="lg:w-1/2">
          <Art file="ui-logo.webp" className="mb-2 h-20 w-20 object-contain drop-shadow-lg" />
          <p className="tracking-[.3em] text-gold">MATH DETECTIVE</p>
          <h1 className="mb-2 text-4xl font-bold drop-shadow-lg sm:text-5xl">คดีปริศนา<br />ค่ากลางของข้อมูล</h1>
          <p className="max-w-md text-lg opacity-90">วันนี้นักเรียนทุกคนคือ นักสืบ</p>
        </div>
        <nav className="grid gap-4 lg:w-1/2" aria-label="เมนูหลัก">
          {items.map(({ to, icon: Icon, title, sub }, k) => (
            <motion.div key={title} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: k * 0.08 }}>
              <Link to={to} className="flex min-h-[84px] items-center gap-4 rounded-2xl bg-navy/80 p-4 ring-2 ring-gold/30 backdrop-blur transition hover:bg-dblue/90 hover:ring-gold">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-gold font-num text-2xl font-black text-navy">{k + 1}</span>
                <span className="flex-1"><span className="block text-2xl font-bold">{title}</span><span className="opacity-80">{sub}</span></span>
                <Icon className="shrink-0 text-gold" size={30} aria-hidden />
              </Link>
            </motion.div>
          ))}
        </nav>
      </div>
    </div>
  );
}
