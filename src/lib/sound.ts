// Tiny WebAudio synth: no audio files to fail loading. Silently no-ops if audio unavailable.
let ctx: AudioContext | null = null;
let rain: { stop: () => void } | null = null;
const ac = () => { try { return (ctx ??= new AudioContext()); } catch { return null; } };

export function sfx(kind: 'click' | 'correct' | 'wrong' | 'stamp' | 'reveal', muted: boolean) {
  const a = ac(); if (!a || muted) return;
  const notes = { click: [660], correct: [523, 659, 784], wrong: [220, 196], stamp: [110], reveal: [440, 880] }[kind];
  notes.forEach((f, i) => {
    const o = a.createOscillator(), g = a.createGain();
    o.type = kind === 'stamp' ? 'square' : 'sine'; o.frequency.value = f;
    const t = a.currentTime + i * 0.12;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.3);
  });
}

/** soft filtered-noise rain ambience for the intro */
export function startRain(muted: boolean) {
  stopRain(); const a = ac(); if (!a || muted) return;
  const buf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate);
  const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource(); src.buffer = buf; src.loop = true;
  const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
  const g = a.createGain(); g.gain.value = 0.035;
  src.connect(f).connect(g).connect(a.destination); src.start();
  rain = { stop: () => { try { src.stop(); } catch { /* already stopped */ } } };
}
export function stopRain() { rain?.stop(); rain = null; }
