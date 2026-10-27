import { Card, Page } from '../components/ui';
import { useSettings } from '../lib/settings';

export default function SettingsPage() {
  const { s, set, motionOn } = useSettings();
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const row = 'flex min-h-[56px] items-center justify-between gap-4 border-b border-navy/10 py-2';
  return (
    <Page title="ตั้งค่า" back="/hq">
      <Card className="mx-auto max-w-lg">
        <label className={row}><span>แอนิเมชันและฉากภาพยนตร์</span><input type="checkbox" className="h-6 w-6" checked={s.animations} onChange={(e) => set({ animations: e.target.checked })} /></label>
        <label className={row}>
          <span>ความเร็วแอนิเมชัน</span>
          <select className="min-h-[44px] rounded-lg border-2 border-navy/15 px-2" value={s.speed} onChange={(e) => set({ speed: Number(e.target.value) })} disabled={!s.animations}>
            <option value={0.75}>ช้า</option><option value={1}>ปกติ</option><option value={1.5}>เร็ว</option><option value={2.5}>เร็วมาก</option>
          </select>
        </label>
        <label className={row}><span>ปิดเสียง</span><input type="checkbox" className="h-6 w-6" checked={s.muted} onChange={(e) => set({ muted: e.target.checked })} /></label>
        {reduced && <p className="mt-3 rounded-lg bg-gold/20 p-3 text-sm">อุปกรณ์นี้ตั้งค่า “ลดการเคลื่อนไหว” ไว้ ระบบจึงปิดแอนิเมชันให้อัตโนมัติ</p>}
        <p className="mt-3 text-sm opacity-70">สถานะ: แอนิเมชัน{motionOn ? 'เปิด' : 'ปิด'} — การตั้งค่านี้บันทึกเฉพาะในอุปกรณ์นี้</p>
      </Card>
    </Page>
  );
}
