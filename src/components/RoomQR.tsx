import { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Copy, Download, Check, AlertTriangle } from 'lucide-react';
import { Btn } from './ui';

/** Real deployed URL (VITE_PUBLIC_SITE_URL) or the current page's origin+path. */
export function joinUrl(code: string) {
  const base = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined) || location.origin + location.pathname;
  return `${base.replace(/#.*$/, '').replace(/\/?$/, '/')}#/join/${code}`;
}
export const isLocalUrl = (u: string) => /\/\/(localhost|127\.0\.0\.1|\[::1\])/.test(u);

export function RoomQR({ code, size = 220, controls = true }: { code: string; size?: number; controls?: boolean }) {
  const url = joinUrl(code);
  const wrap = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const download = () => {
    const c = wrap.current?.querySelector('canvas'); if (!c) return;
    const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = `room-${code}.png`; a.click();
  };
  return (
    <div className="flex flex-col items-center gap-3">
      <div ref={wrap} className="rounded-2xl bg-white p-3 shadow-lg"><QRCodeCanvas value={url} size={size} level="M" marginSize={1} /></div>
      <div className="text-center font-num text-4xl font-black tracking-[.25em] sm:text-5xl" aria-label={`รหัสห้อง ${code.split('').join(' ')}`}>{code}</div>
      <div className="max-w-full break-all text-center text-sm opacity-80">{url}</div>
      {isLocalUrl(url) && (
        <p className="flex items-center gap-2 rounded-lg bg-alert/15 p-2 text-sm text-alert"><AlertTriangle size={16} aria-hidden />
          ลิงก์นี้เป็น localhost โทรศัพท์นักเรียนเปิดไม่ได้ ให้ใช้เว็บที่ Deploy แล้ว หรือตั้ง VITE_PUBLIC_SITE_URL</p>
      )}
      {controls && (
        <div className="flex flex-wrap justify-center gap-2">
          <Btn variant="navy" onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { prompt('คัดลอกลิงก์นี้', url); } }}>
            {copied ? <Check size={18} aria-hidden /> : <Copy size={18} aria-hidden />} {copied ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์'}
          </Btn>
          <Btn variant="navy" onClick={download}><Download size={18} aria-hidden /> ดาวน์โหลด QR</Btn>
        </div>
      )}
    </div>
  );
}
