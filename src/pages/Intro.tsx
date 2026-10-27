import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { CharacterSprite, CutsceneControls, DialogueBox, HQScene, Typewriter, useSequence, type Step } from '../components/cinema';
import { Mina } from '../components/characters';
import { Art, CutVideo } from '../components/art';
import { useDur, useSettings } from '../lib/settings';
import { startRain, stopRain, sfx } from '../lib/sound';

const STEPS: Step[] = [
  { id: 'dark', ms: 900 }, { id: 'window', ms: 2600 }, { id: 'lamp', ms: 1100 }, { id: 'desk', ms: 1400 },
  { id: 'envelope', ms: 1100 }, { id: 'mina', ms: 1100 }, { id: 'open', ms: 1300 }, { id: 'title', ms: 2200 },
  { id: 'owl', ms: 2400 }, { id: 'ready' },
];

export default function Intro() {
  const nav = useNavigate();
  const { s } = useSettings();
  const dur = useDur();
  const [started, setStarted] = useState(false);
  const q = useSequence(STEPS, started);
  useEffect(() => () => stopRain(), []);
  useEffect(() => { if (q.step === 'envelope' && started) sfx('stamp', s.muted); }, [q.step]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (s.muted) stopRain(); else if (started) startRain(false); }, [s.muted]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = () => { stopRain(); nav('/hq'); };
  const camX = q.at('window') ? (q.at('desk') ? -40 : 0) : 140;

  // first tap is required anyway for browsers to allow audio
  if (!started) {
    return (
      <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-black p-6 text-center text-cream">
        <Art file="title-bg.webp" className="absolute inset-0 h-full w-full object-cover opacity-50" />
        <div className="relative">
          <p className="mb-2 tracking-[.3em] text-gold">MATH DETECTIVE</p>
          <h1 className="mb-6 text-3xl font-bold sm:text-5xl">คดีปริศนาค่ากลางของข้อมูล</h1>
          <div className="flex flex-wrap justify-center gap-3">
            <button autoFocus onClick={() => { setStarted(true); startRain(s.muted); }} className="min-h-[52px] rounded-xl bg-gold px-8 text-lg font-bold text-navy">▶ เปิดแฟ้มคดี</button>
            <button onClick={go} className="min-h-[52px] rounded-xl px-6 ring-2 ring-cream/50">ข้ามฉาก</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black text-cream">
      <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: q.at('window') ? 1 : 0 }} transition={{ duration: dur(1.2) }}>
        <HQScene camX={camX} zoom={q.at('desk') ? 1.12 : 1} lamp={q.at('lamp')}>
          <AnimatePresence>
            {q.at('envelope') && (
              <motion.div className="absolute bottom-[14%] left-1/2 z-20 h-24 w-40 -translate-x-1/2 rounded bg-[#c9973f] shadow-2xl sm:h-28 sm:w-48"
                initial={{ y: -500, rotate: -25 }} animate={{ y: 0, rotate: -4 }} transition={{ duration: dur(0.7), type: 'spring', bounce: 0.25 }}>
                <div className="absolute inset-x-0 top-0 h-1/2 bg-[#e0b25a] [clip-path:polygon(0_0,100%_0,50%_100%)]" />
                <div className="absolute bottom-2 right-2 rotate-[-8deg] rounded border-2 border-alert px-1 text-xs font-bold text-alert">ลับ</div>
              </motion.div>
            )}
          </AnimatePresence>
          <CharacterSprite show={q.at('mina')} from="left" className="absolute bottom-0 left-[4%] z-30 h-[58%] w-[38%] max-w-[300px] sm:left-[10%]">
            <Mina open={q.at('open')} />
          </CharacterSprite>
          {/* optional clip plays over the drawn scene; text and controls stay on top */}
          <CutVideo file="cut-intro.mp4" className="absolute inset-0 z-[35] h-full w-full object-cover" />
        </HQScene>
      </motion.div>

      <div className="absolute inset-x-0 top-[12%] z-40 px-4 text-center">
        {q.at('title') && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <p className="mb-1 tracking-[.35em] text-gold drop-shadow">MATH DETECTIVE</p>
            <h1 className="text-3xl font-bold drop-shadow-[0_4px_12px_rgba(0,0,0,.8)] sm:text-6xl"><Typewriter text="คดีปริศนาค่ากลางของข้อมูล" cps={14} /></h1>
          </motion.div>
        )}
      </div>

      {q.at('owl') && (
        <div className="absolute bottom-4 right-3 z-40 w-[min(560px,92%)]">
          <DialogueBox text="สวัสดีนักสืบฝึกหัด! เข็มทิศค่ากลางหายไป เราต้องใช้ค่าเฉลี่ย มัธยฐาน และฐานนิยม ไขคดีทั้งหมดในนครข้อมูลให้ได้" />
        </div>
      )}
      {q.done && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="absolute inset-x-0 top-[38%] z-50 flex justify-center gap-3">
          <button autoFocus onClick={go} className="inline-flex min-h-[56px] items-center gap-2 rounded-xl bg-gold px-8 text-xl font-bold text-navy shadow-[0_5px_0_#b5740a]"><Search aria-hidden /> เริ่มสืบสวน</button>
        </motion.div>
      )}
      <CutsceneControls onSkip={q.skip} onReplay={q.replay} done={q.done} />
    </div>
  );
}
