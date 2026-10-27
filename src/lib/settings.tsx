import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { MotionConfig } from 'framer-motion';

export interface Settings { animations: boolean; speed: number; muted: boolean }
const DEFAULTS: Settings = { animations: true, speed: 1, muted: false };
const KEY = 'md-settings';

function load(): Settings {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; } catch { return DEFAULTS; }
}
const prefersReduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const Ctx = createContext<{ s: Settings; set: (p: Partial<Settings>) => void; motionOn: boolean }>({ s: DEFAULTS, set: () => {}, motionOn: true });

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState(load);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* per-device convenience only */ } }, [s]);
  const motionOn = s.animations && !prefersReduced();
  return (
    <Ctx.Provider value={{ s, set: (p) => setS((o) => ({ ...o, ...p })), motionOn }}>
      <MotionConfig reducedMotion={motionOn ? 'never' : 'always'}>{children}</MotionConfig>
    </Ctx.Provider>
  );
}
export const useSettings = () => useContext(Ctx);
/** seconds scaled by the user's animation-speed setting */
export const useDur = () => { const { s, motionOn } = useSettings(); return (sec: number) => (motionOn ? sec / s.speed : 0); };
