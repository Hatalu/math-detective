import { useMemo, useState } from 'react';
import { LayoutGroup, motion } from 'framer-motion';
import { calculationSteps, fmt, frequencies, calculateModes, type Measure } from '../lib/math';
import { useDur } from '../lib/settings';
import { Btn } from './ui';

/** Number cards animate into ascending order. Cards keep their original identity; values never change. */
export function DataSortingAnimation({ data, marked = [], onToggle, highlightMiddle = false }: {
  data: number[]; marked?: number[]; onToggle?: (i: number) => void; highlightMiddle?: boolean;
}) {
  const [sorted, setSorted] = useState(false);
  const dur = useDur();
  const items = useMemo(() => data.map((v, i) => ({ v, i })), [data]);
  const order = sorted ? [...items].sort((a, b) => a.v - b.v || a.i - b.i) : items;
  const n = data.length, mid = Math.floor(n / 2);
  const middlePos = n % 2 ? [mid] : [mid - 1, mid];
  return (
    <div>
      <LayoutGroup>
        <ul className="flex flex-wrap gap-2" aria-label={sorted ? 'ข้อมูลเรียงจากน้อยไปมาก' : 'ข้อมูลตามลำดับเดิม'}>
          {order.map((it, pos) => {
            const isMid = sorted && highlightMiddle && middlePos.includes(pos);
            const isMarked = marked.includes(it.i);
            return (
              <motion.li layout key={it.i} transition={{ duration: dur(0.6), type: 'spring', bounce: 0.2 }}>
                <button type="button" onClick={() => onToggle?.(it.i)} aria-pressed={isMarked}
                  className={`relative grid min-h-[52px] min-w-[52px] place-items-center rounded-lg px-2 font-num text-xl font-bold shadow transition
                  ${isMid ? 'bg-gold text-navy ring-4 ring-gold/50' : isMarked ? 'bg-teal text-white' : 'bg-cream text-navy ring-1 ring-navy/20'}`}>
                  {fmt(it.v)}
                  {sorted && <span className="absolute -bottom-2 rounded bg-navy px-1 text-[11px] font-normal text-cream">#{pos + 1}</span>}
                </button>
              </motion.li>
            );
          })}
        </ul>
      </LayoutGroup>
      <div className="mt-4 flex flex-wrap gap-2">
        <Btn variant="navy" type="button" onClick={() => setSorted((x) => !x)}>{sorted ? 'กลับลำดับเดิม' : 'เรียงจากน้อยไปมาก'}</Btn>
      </div>
      {onToggle && <p className="mt-2 text-sm opacity-70">แตะตัวเลขเพื่อทำเครื่องหมายหลักฐานที่สำคัญ (ทำเครื่องหมายแล้ว {marked.length} ค่า)</p>}
    </div>
  );
}

/** Repeated values group together into frequency columns. */
export function ModeGrouping({ data }: { data: number[] }) {
  const f = frequencies(data);
  const modes = calculateModes(data);
  const dur = useDur();
  return (
    <div className="flex flex-wrap items-end gap-3" aria-label="ตารางความถี่">
      {f.map(([v, c], k) => (
        <div key={v} className="flex flex-col items-center gap-1">
          {Array.from({ length: c }, (_, j) => (
            <motion.div key={j} initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: dur(0.08 * (k + j)) }}
              className={`h-6 w-10 rounded ${modes.includes(v) ? 'bg-gold' : 'bg-dblue/70'}`} />
          ))}
          <div className="font-num text-lg font-bold">{fmt(v)}</div>
          <div className="text-xs opacity-70">ความถี่ {c}</div>
        </div>
      ))}
    </div>
  );
}

/** Step-by-step working; teacher (or student after submitting) reveals one step at a time. */
export function CalculationStepReveal({ measure, data, allAtOnce = false }: { measure: Measure; data: number[]; allAtOnce?: boolean }) {
  const steps = calculationSteps(measure, data);
  const [shown, setShown] = useState(allAtOnce ? steps.length : 1);
  return (
    <div>
      <ol className="space-y-2">
        {steps.slice(0, shown).map((st, k) => (
          <motion.li key={k} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
            className={`rounded-lg p-3 font-num text-base sm:text-lg ${k === shown - 1 ? 'bg-gold/25 ring-2 ring-gold' : 'bg-navy/5'}`}>
            <span className="mr-2 font-bold text-teal">ขั้นที่ {k + 1}</span>{st}
          </motion.li>
        ))}
      </ol>
      {measure === 'mode' && shown >= 2 && <div className="mt-3"><ModeGrouping data={data} /></div>}
      {shown < steps.length && <Btn variant="teal" className="mt-3" onClick={() => setShown((x) => x + 1)}>แสดงขั้นถัดไป</Btn>}
    </div>
  );
}
