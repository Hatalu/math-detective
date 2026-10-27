import { motion } from 'framer-motion';
import { Art } from './art';

// Vector characters drawn in code: fallback when public/assets/char-*.webp is missing or fails to load.

function MinaSvg({ open = false }: { open?: boolean }) {
  return (
    <svg viewBox="0 0 200 260" className="h-full w-full drop-shadow-[0_10px_20px_rgba(0,0,0,.45)]" role="img" aria-label="นักสืบมีนา">
      {/* coat */}
      <path d="M50 150 Q100 125 150 150 L165 260 H35 Z" fill="#263C68" />
      <path d="M100 140 L80 260 H120 Z" fill="#FFF8E8" opacity=".9" />
      <path d="M100 140 L88 175 L100 185 L112 175 Z" fill="#B93838" />
      <path d="M50 150 L70 200 L60 260 M150 150 L130 200 L140 260" stroke="#14213D" strokeWidth="4" fill="none" />
      {/* neck + head */}
      <rect x="90" y="118" width="20" height="22" rx="6" fill="#E9B98F" />
      <circle cx="100" cy="95" r="38" fill="#F2C9A0" />
      <path d="M62 95 Q60 50 100 52 Q142 50 138 98 Q130 72 100 74 Q74 72 62 95Z" fill="#2B1B14" />
      <path d="M62 95 Q58 125 70 135 L74 100Z M138 98 Q142 125 130 135 L126 100Z" fill="#2B1B14" />
      {/* beret */}
      <ellipse cx="96" cy="56" rx="44" ry="14" fill="#FCA311" />
      <circle cx="96" cy="44" r="5" fill="#FCA311" />
      <circle cx="86" cy="98" r="4.5" fill="#14213D" /><circle cx="114" cy="98" r="4.5" fill="#14213D" />
      <circle cx="87.5" cy="96.5" r="1.4" fill="#fff" /><circle cx="115.5" cy="96.5" r="1.4" fill="#fff" />
      <path d="M90 114 Q100 121 110 114" stroke="#8a4a3a" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="78" cy="110" r="5" fill="#f4a3a3" opacity=".5" /><circle cx="122" cy="110" r="5" fill="#f4a3a3" opacity=".5" />
      {/* arms + folder */}
      <motion.g animate={{ rotate: open ? -18 : 0 }} style={{ originX: '60px', originY: '160px' }} transition={{ duration: 0.6 }}>
        <path d="M55 160 Q45 200 80 215" stroke="#263C68" strokeWidth="18" fill="none" strokeLinecap="round" />
        <rect x="70" y="190" width="60" height="44" rx="4" fill="#d9a441" stroke="#8a6420" strokeWidth="2" />
        <motion.rect x="70" y="190" width="60" height="44" rx="4" fill="#f0c463" stroke="#8a6420" strokeWidth="2"
          animate={{ scaleY: open ? -0.35 : 1 }} style={{ originY: '190px' }} transition={{ duration: 0.6, delay: 0.2 }} />
      </motion.g>
      <path d="M145 160 Q160 200 125 215" stroke="#263C68" strokeWidth="18" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function CodySvg({ talking = false }: { talking?: boolean }) {
  return (
    <svg viewBox="0 0 120 130" className="h-full w-full drop-shadow-[0_6px_12px_rgba(0,0,0,.4)]" role="img" aria-label="โค้ดี้ นกฮูกผู้ช่วย">
      <path d="M25 40 L35 15 L50 35 M95 40 L85 15 L70 35" fill="#7a5532" />
      <ellipse cx="60" cy="75" rx="42" ry="48" fill="#8b6239" />
      <ellipse cx="60" cy="88" rx="26" ry="30" fill="#e8cfa4" />
      <path d="M48 80 l6 6 6-6 6 6 6-6 M48 94 l6 6 6-6 6 6 6-6" stroke="#b79566" strokeWidth="2" fill="none" />
      <circle cx="42" cy="55" r="17" fill="#fff8e8" stroke="#FCA311" strokeWidth="3" />
      <circle cx="78" cy="55" r="17" fill="#fff8e8" stroke="#FCA311" strokeWidth="3" />
      <path d="M59 55 h2" stroke="#FCA311" strokeWidth="3" />
      <motion.g animate={{ scaleY: [1, 1, 0.1, 1] }} transition={{ repeat: Infinity, duration: 4, times: [0, 0.9, 0.95, 1] }} style={{ originY: '55px' }}>
        <circle cx="42" cy="55" r="7" fill="#14213D" /><circle cx="78" cy="55" r="7" fill="#14213D" />
        <circle cx="44" cy="53" r="2" fill="#fff" /><circle cx="80" cy="53" r="2" fill="#fff" />
      </motion.g>
      <motion.path d="M54 68 L60 80 L66 68Z" fill="#FCA311" animate={talking ? { scaleY: [1, 0.6, 1] } : {}} transition={{ repeat: Infinity, duration: 0.35 }} style={{ originY: '68px' }} />
      <path d="M18 75 Q5 95 22 112 M102 75 Q115 95 98 112" stroke="#6d4a2a" strokeWidth="10" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function OrderSvg() {
  return (
    <svg viewBox="0 0 160 220" className="h-full w-full" role="img" aria-label="คุณออร์เดอร์ ผู้ดูแลหอจดหมายเหตุ">
      <path d="M35 120 Q80 100 125 120 L135 220 H25 Z" fill="#16866A" />
      <rect x="70" y="95" width="20" height="20" fill="#d9a77c" />
      <circle cx="80" cy="72" r="32" fill="#e6b88f" />
      <path d="M48 70 Q50 38 80 38 Q110 38 112 70 Q100 52 80 54 Q60 52 48 70" fill="#cfcfcf" />
      <circle cx="68" cy="74" r="9" fill="none" stroke="#14213D" strokeWidth="3" /><circle cx="92" cy="74" r="9" fill="none" stroke="#14213D" strokeWidth="3" />
      <circle cx="68" cy="74" r="3" fill="#14213D" /><circle cx="92" cy="74" r="3" fill="#14213D" />
      <path d="M70 90 Q80 96 90 90" stroke="#7a4636" strokeWidth="3" fill="none" />
      <path d="M62 98 Q80 112 98 98" fill="#cfcfcf" />
    </svg>
  );
}

function OutlierSvg() {
  return (
    <motion.svg viewBox="0 0 120 140" className="h-full w-full" role="img" aria-label="เงาค่าสุดโต่ง"
      animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}>
      <path d="M60 10 Q105 10 105 70 L105 130 Q95 118 85 130 Q75 118 65 130 Q55 118 45 130 Q35 118 25 130 Q15 118 15 130 L15 70 Q15 10 60 10Z" fill="#3b2f6b" opacity=".9" />
      <ellipse cx="44" cy="60" rx="10" ry="13" fill="#FCA311" /><ellipse cx="76" cy="60" rx="10" ry="13" fill="#FCA311" />
      <circle cx="46" cy="62" r="4" fill="#14213D" /><circle cx="78" cy="62" r="4" fill="#14213D" />
      <path d="M48 90 Q60 98 72 90" stroke="#FCA311" strokeWidth="3" fill="none" strokeLinecap="round" />
      <text x="88" y="30" fontSize="22" fill="#FCA311" fontWeight="700">?</text>
    </motion.svg>
  );
}

const pic = 'h-full w-full object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,.45)]';
export const Mina = ({ open = false }: { open?: boolean }) => <Art file="char-mina.webp" alt="นักสืบมีนา" className={pic} fallback={<MinaSvg open={open} />} />;
export const Cody = ({ talking = false }: { talking?: boolean }) => <Art file="char-cody.webp" alt="นกฮูกโค้ดี้" className={pic} fallback={<CodySvg talking={talking} />} />;
export const Order = () => <Art file="char-order.webp" alt="คุณออร์เดอร์" className={pic} fallback={<OrderSvg />} />;
export const OutlierShadow = () => <Art file="char-outlier.webp" alt="เงาค่าสุดโต่ง" className={pic} fallback={<OutlierSvg />} />;
