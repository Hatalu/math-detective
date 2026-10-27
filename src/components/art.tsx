import { useEffect, useState, type ReactNode } from 'react';
import { useSettings } from '../lib/settings';

// Optional art from public/assets (see ART_PROMPTS.md). Missing file → fallback, game never breaks.
const FOLDER: Record<string, string> = { char: 'char', item: 'item', ui: 'ui', cut: 'video' };
/** 'char-mina.webp' → 'assets/char/char-mina.webp'; backgrounds live in assets/bg. */
export const asset = (file: string) => `assets/${FOLDER[file.split('-')[0]] ?? 'bg'}/${file}`;

export function Art({ file, fallback = null, alt = '', className = 'h-full w-full object-contain' }: { file: string; fallback?: ReactNode; alt?: string; className?: string }) {
  const [ok, setOk] = useState(true);
  return ok ? <img src={asset(file)} alt={alt} aria-hidden={!alt} onError={() => setOk(false)} className={className} /> : <>{fallback}</>;
}

/** Cutscene clip as a background layer. Off when animations are off; missing file → nothing. */
export function CutVideo({ file, className = 'absolute inset-0 h-full w-full object-cover' }: { file: string; className?: string }) {
  const { motionOn } = useSettings();
  const [ok, setOk] = useState(true);
  if (!motionOn || !ok) return null;
  return <video src={asset(file)} autoPlay muted playsInline aria-hidden onError={() => setOk(false)} className={className} />;
}

const seen = new Map<string, boolean>();
/** true once the optional image loads; false while loading or if missing (callers keep their plain CSS look until then) */
export function useHasAsset(file: string) {
  const [ok, setOk] = useState(seen.get(file) ?? false);
  useEffect(() => {
    if (seen.has(file)) return;
    const i = new Image();
    i.onload = () => { seen.set(file, true); setOk(true); };
    i.onerror = () => seen.set(file, false);
    i.src = asset(file);
  }, [file]);
  return ok;
}
