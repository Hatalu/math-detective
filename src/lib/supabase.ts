import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Project URL + anon (public) key are safe to ship: every browser receives them anyway and RLS guards the data.
// Never put the service_role key here. Env vars override these (e.g. for a test project).
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || 'https://nuzopewpmnrerjddvrqz.supabase.co';
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51em9wZXdwbW5yZXJqZGR2cnF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxMTU4MTEsImV4cCI6MjEwODY5MTgxMX0.uiZAttuZWs5qKqw7_GoZy5J-FK8tZhClOEIEvGbBP68';

/** null = backend not configured → pages show "Setup Required" instead of fake data. */
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null;
export const SUPABASE_URL = url ?? '';
export const SUPABASE_ANON_KEY = key ?? '';

export function db(): SupabaseClient {
  if (!supabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase (ดู README หัวข้อ “ตั้งค่าฐานข้อมูล”)');
  return supabase;
}

/** Students: anonymous auth session (no account needed). */
export async function ensureStudentSession() {
  const c = db();
  const { data } = await c.auth.getSession();
  if (data.session) return data.session;
  const r = await c.auth.signInAnonymously();
  if (r.error) throw new Error('เข้าสู่ระบบแบบไม่ระบุตัวตนไม่สำเร็จ: ' + r.error.message + ' (ครูต้องเปิด Anonymous Sign-ins ใน Supabase)');
  return r.data.session!;
}

/** Map Postgres/RPC error codes raised in schema.sql to Thai messages with a fix. */
export function thaiError(e: unknown): string {
  const msg = (e as { message?: string })?.message ?? String(e);
  const map: Record<string, string> = {
    ROOM_NOT_FOUND: 'ไม่พบห้องนี้ ตรวจสอบรหัสห้องอีกครั้ง',
    ROOM_CLOSED: 'ห้องปิดรับทีมใหม่แล้ว แจ้งครูให้เปิดรับทีม',
    ROOM_ENDED: 'เกมในห้องนี้จบแล้ว',
    BAD_TEAM_NAME: 'ชื่อทีมต้องยาว 2–30 ตัวอักษร',
    NOT_ACTIVE: 'ขณะนี้ภารกิจยังไม่เปิดรับคำตอบ (รอครูเริ่มหรือกลับมาเล่นต่อ)',
    TIME_UP: 'หมดเวลาส่งคำตอบของภารกิจนี้แล้ว',
    NOT_MEMBER: 'อุปกรณ์นี้ยังไม่ได้เข้าร่วมทีม กรุณาเข้าห้องใหม่ผ่าน QR Code',
    HINTS_OFF: 'ครูปิดการใช้คำใบ้อยู่',
    HINT_ORDER: 'ต้องเปิดคำใบ้ระดับก่อนหน้าก่อน',
    NOT_TEACHER: 'บัญชีนี้ยังไม่ได้รับสิทธิ์ครู (ดู README หัวข้อ “สร้างบัญชีครู”)',
    'Failed to fetch': 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง',
  };
  for (const k of Object.keys(map)) if (msg.includes(k)) return map[k];
  return msg;
}
