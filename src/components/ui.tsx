import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Database, Loader2, Settings as Gear, Wifi, WifiOff, AlertTriangle, Inbox } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSettings } from '../lib/settings';
import { sfx } from '../lib/sound';

type Variant = 'gold' | 'navy' | 'ghost' | 'teal' | 'danger';
const V: Record<Variant, string> = {
  gold: 'bg-gold text-navy hover:brightness-105 shadow-[0_4px_0_#b5740a]',
  navy: 'bg-dblue text-cream hover:bg-navy shadow-[0_4px_0_#0b1426]',
  teal: 'bg-teal text-white hover:brightness-110 shadow-[0_4px_0_#0d5242]',
  danger: 'bg-alert text-white hover:brightness-110 shadow-[0_4px_0_#7a2222]',
  ghost: 'bg-white/10 text-current ring-1 ring-current/30 hover:bg-white/20',
};

export function Btn({ variant = 'gold', className = '', onClick, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const { s } = useSettings();
  return (
    <button
      {...p}
      onClick={(e) => { sfx('click', s.muted); onClick?.(e); }}
      className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-5 py-2.5 font-semibold transition active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-gold ${V[variant]} ${className}`}
    />
  );
}

export function Spinner({ label = 'กำลังโหลด…' }: { label?: string }) {
  return <div role="status" className="flex items-center justify-center gap-2 p-8 opacity-80"><Loader2 className="animate-spin" aria-hidden /> {label}</div>;
}

export function ErrorBox({ msg, onRetry }: { msg: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-alert/40 bg-alert/10 p-4 text-alert">
      <AlertTriangle aria-hidden /> <span className="flex-1">{msg}</span>
      {onRetry && <Btn variant="danger" onClick={onRetry}>ลองอีกครั้ง</Btn>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-current/20 p-8 text-center opacity-70"><Inbox aria-hidden />{children}</div>;
}

export function useOnline() {
  const [on, setOn] = useState(navigator.onLine);
  useEffect(() => {
    const a = () => setOn(true), b = () => setOn(false);
    addEventListener('online', a); addEventListener('offline', b);
    return () => { removeEventListener('online', a); removeEventListener('offline', b); };
  }, []);
  return on;
}

/** realtime: channel status from useRealtime; shows offline / reconnecting / live honestly */
export function ConnectionBadge({ realtime }: { realtime?: string }) {
  const online = useOnline();
  const live = online && (realtime === undefined || realtime === 'SUBSCRIBED');
  const text = !supabase ? 'ยังไม่เชื่อมฐานข้อมูล' : !online ? 'ออฟไลน์' : realtime && realtime !== 'SUBSCRIBED' ? 'กำลังเชื่อมต่อใหม่…' : 'เชื่อมต่อแล้ว';
  return (
    <span aria-live="polite" className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${live && supabase ? 'bg-teal/15 text-teal' : 'bg-alert/15 text-alert'}`}>
      {live ? <Wifi size={16} aria-hidden /> : <WifiOff size={16} aria-hidden />} {text}
    </span>
  );
}

export function SetupRequired() {
  return (
    <div className="mx-auto max-w-xl rounded-2xl bg-white p-6 text-navy shadow-lg">
      <h2 className="mb-2 flex items-center gap-2 text-xl font-bold"><Database aria-hidden /> ต้องตั้งค่าฐานข้อมูลก่อน (Setup Required)</h2>
      <p className="mb-3">ระบบห้องเรียนแบบหลายทีม บอร์ดผลงาน และ Exit Ticket ต้องใช้ Supabase ซึ่งยังไม่ได้ตั้งค่าในเว็บนี้ ระบบจะไม่แสดงข้อมูลจำลองแทนข้อมูลจริง</p>
      <ol className="mb-4 list-decimal space-y-1 pl-5 text-sm">
        <li>สร้างโปรเจกต์ Supabase แล้วรันไฟล์ <code>supabase/schema.sql</code></li>
        <li>คัดลอก <code>.env.example</code> เป็น <code>.env</code> แล้วใส่ URL และ anon key</li>
        <li>Build/Deploy ใหม่ (ดู README)</li>
      </ol>
      <Link to="/practice" className="font-semibold text-teal underline">ระหว่างนี้ลองเล่นโหมดฝึกสืบสวน (เล่นบนเครื่องนี้ ไม่บันทึกผล) →</Link>
    </div>
  );
}

export function Page({ title, back, children, dark = false, right }: { title: string; back?: string; children: ReactNode; dark?: boolean; right?: ReactNode }) {
  const nav = useNavigate();
  return (
    <div className={`min-h-dvh ${dark ? 'paper-dark text-cream' : 'paper text-navy'}`}>
      <header className={`sticky top-0 z-30 flex items-center gap-2 px-3 py-2 backdrop-blur sm:px-6 ${dark ? 'bg-navy/80' : 'bg-cream/85 shadow-sm'}`}>
        <button onClick={() => (back ? nav(back) : nav(-1))} className="grid h-11 w-11 place-items-center rounded-full hover:bg-black/10 focus-visible:outline focus-visible:outline-4 focus-visible:outline-gold" aria-label="ย้อนกลับ">
          <ArrowLeft aria-hidden />
        </button>
        <h1 className="flex-1 truncate text-lg font-bold sm:text-xl">{title}</h1>
        {right}
        <Link to="/settings" aria-label="ตั้งค่า" className="grid h-11 w-11 place-items-center rounded-full hover:bg-black/10"><Gear aria-hidden /></Link>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6">{children}</main>
    </div>
  );
}

export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) =>
  <section className={`rounded-2xl bg-white p-4 text-navy shadow-md ring-1 ring-navy/5 sm:p-5 ${className}`}>{children}</section>;

export const Field = ({ label, children }: { label: string; children: ReactNode }) =>
  <label className="block"><span className="mb-1 block text-sm font-semibold">{label}</span>{children}</label>;

export const inputCls = 'w-full min-h-[44px] rounded-lg border-2 border-navy/15 bg-white px-3 py-2 text-base text-navy focus:border-gold focus:outline-none';
