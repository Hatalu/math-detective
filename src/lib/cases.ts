import { calculationSteps, expectedFor, type ExpectedAnswer, type Measure } from './math';

export type EvidenceKind = 'document' | 'photo' | 'slip' | 'note';
export interface Evidence { kind: EvidenceKind; title: string; body: string }

/** Student-visible part of a question (stored in questions.content). */
export interface QuestionContent {
  code: string;            // e.g. CASE 01
  title: string;
  story: string;           // case brief
  objective: string;       // mission objective
  evidence: Evidence[];
  data: number[];
  dataLabel: string;       // what each number means
  unit: string;
  prompt: string;
  /** 'choose' = students must decide which measure fits; otherwise the measure is given */
  target: Measure | 'choose';
  askValue: boolean;
  difficulty: 1 | 2 | 3;
}

/** Teacher-only part (question_answers + clues tables). */
export interface QuestionSecret {
  measure: Measure;        // the measure that answers the question
  clues: [string, string, string];
  reasoning: string;
  misconceptions: string;
  limitations: string;
}

export interface CaseQuestion extends QuestionContent, QuestionSecret { id?: string }

export function answerKey(q: CaseQuestion): ExpectedAnswer & { steps: string[] } {
  return { ...expectedFor(q.measure, q.data), steps: calculationSteps(q.measure, q.data) };
}

/** One clue hidden in the case scene. x/y = centre in % of the scene, w = width in % of the scene width. */
export interface SceneItem { name: string; label: string; file: string; value: string; x: number; y: number; w: number; rot?: number }

/** Everything the class screens need that is not in the database: scene art, items, teacher prompt. */
export interface CaseScene {
  bg: string;              // public/assets/bg/<bg>
  detective: string;       // who brings the case
  items: SceneItem[];      // one per data value, same order as data
  dataText: string;        // data as students should write it
  teacherAsk: string;      // prompt the teacher uses while walking around (never the answer)
  explain: string;         // extra explanation after the reveal
  /** every measure that counts as right; students may tick several and must tick exactly these */
  answers: Measure[];
}

const PROMPT = 'คดีนี้ควรใช้ค่ากลางใดจึงเหมาะสมที่สุด และเพราะอะไร';

// The 3 cases of the 5E lesson plan, in teaching order. CASE 03 is categorical: blood groups are coded 1=A 2=B 3=O
// only so the existing numeric answer key works; students only ever see the letters (askValue is false).
export const DEFAULT_CASES: CaseQuestion[] = [
  {
    code: 'CASE 01', title: 'คดีเศรษฐีล่องหน', difficulty: 1,
    story: 'ผู้กองหญิงกำลังตรวจสอบรายได้ต่อเดือนของคน 5 คนในคฤหาสน์ แต่หนึ่งในนั้นคือเจ้าของบ้านที่รวยมหาศาล ทำให้ตัวเลขโดดเด่นจากคนอื่นมาก',
    objective: 'หาของ 5 ชิ้นในคฤหาสน์ แต่ละชิ้นบอกรายได้ต่อเดือนของเจ้าของ แล้วเลือกค่ากลางที่เป็นตัวแทนรายได้ของคนในคฤหาสน์',
    evidence: [], data: [12, 14, 13, 15, 1000], dataLabel: 'รายได้ต่อเดือน', unit: 'พันบาท',
    prompt: PROMPT, target: 'choose', askValue: false, measure: 'median',
    clues: ['ข้อมูลชุดนี้มีค่าไหนแปลกไหม', 'ค่าสูงสุดคือ {max} ส่วนค่าอื่นอยู่ราว ๆ {min}', 'ถ้าเรียงข้อมูลแล้วดูตัวตรงกลาง จะได้ {middle}'],
    reasoning: 'ใช้มัธยฐาน เพราะมีข้อมูลที่มีค่าสูงโดดเด่นกว่าข้อมูลอื่นมาก (1,000) ซึ่งจะทำให้ค่าเฉลี่ยเลขคณิตสูงเกินจริง',
    misconceptions: 'ใช้ค่าเฉลี่ยเลขคณิต ได้ 210.8 พันบาท ซึ่งสูงกว่ารายได้ของคน 4 ใน 5 คนมาก',
    limitations: 'มัธยฐานไม่ได้ใช้ทุกค่าในการคำนวณ',
  },
  {
    code: 'CASE 02', title: 'คดีรอยเท้าปริศนา', difficulty: 1,
    story: 'ผู้หมวดเอิร์ธพบรอยเท้าของคนร้าย 7 รอยในที่เกิดเหตุ ซึ่งมีขนาดใกล้เคียงกันมาก จึงต้องการหาขนาดรองเท้าที่เป็นตัวแทนภาพรวมเพื่อสั่งสกัดจับ',
    objective: 'หารอยเท้า 7 รอยในที่เกิดเหตุ แต่ละรอยบอกขนาดรองเท้า แล้วเลือกค่ากลางที่เป็นตัวแทนภาพรวม',
    evidence: [], data: [26, 27, 26, 28, 28, 25, 25], dataLabel: 'ขนาดรองเท้าของคนร้าย', unit: 'Size',
    prompt: PROMPT, target: 'choose', askValue: false, measure: 'mean',
    clues: ['คดีนี้มีค่าแปลกเหมือนคดีที่แล้วไหม', 'ข้อมูลอยู่ระหว่าง {min} ถึง {max} เท่านั้น', 'ผลรวม {sum} ÷ {n} รอย ได้ค่าอะไร'],
    reasoning: 'ใช้ค่าเฉลี่ยเลขคณิตและมัธยฐาน เพราะข้อมูลมีค่าใกล้เคียงกันมาก (25 ถึง 28) และไม่มีค่าที่สูงหรือต่ำจนผิดปกติ ทั้งสองค่าจึงเป็นตัวแทนภาพรวมได้ดี ส่วนฐานนิยมไม่เหมาะ เพราะ 25, 26 และ 28 ซ้ำเท่ากันหมด ได้ฐานนิยม 3 ค่า ไม่ช่วยสรุปขนาดเดียวที่เป็นตัวแทน',
    misconceptions: 'เห็น 25, 26 และ 28 ซ้ำกัน จึงคิดว่าต้องใช้ฐานนิยม แต่ข้อมูลซ้ำไม่ได้แปลว่าต้องใช้ฐานนิยมเสมอ ต้องดูว่าโจทย์ถามอะไร',
    limitations: 'ถ้ามีรอยเท้าที่ต่างจากรอยอื่นมาก ค่าเฉลี่ยจะเปลี่ยนไปมาก',
  },
  {
    code: 'CASE 03', title: 'คดีรอยเลือดปริศนา', difficulty: 1,
    story: 'แพทย์นิติเวชต้องการหาหมู่เลือดส่วนใหญ่ของกลุ่มผู้ต้องสงสัยที่ทิ้งไว้ในที่เกิดเหตุ เพื่อแคบวงล้อมคนร้าย',
    objective: 'หาหลอดตัวอย่างเลือด 6 หลอดในห้องนิติเวช แต่ละหลอดบอกหมู่เลือด แล้วเลือกค่ากลางที่บอกหมู่เลือดส่วนใหญ่',
    evidence: [], data: [1, 2, 3, 3, 1, 3], dataLabel: 'หมู่เลือดของผู้ต้องสงสัย', unit: '',
    prompt: PROMPT, target: 'choose', askValue: false, measure: 'mode',
    clues: ['แพทย์นิติเวชต้องการหาอะไร', 'หมู่เลือดนำมาบวกกันได้ไหม', 'หมู่เลือดไหนพบบ่อยที่สุด'],
    reasoning: 'ใช้ฐานนิยม เพราะข้อมูลเป็นหมวดหมู่ (หมู่เลือด) ไม่ใช่ปริมาณตัวเลขที่นำมาบวกกันได้ และโจทย์ถามหมู่เลือด “ส่วนใหญ่” (หมู่ O พบ 3 ครั้ง)',
    misconceptions: 'พยายามหาค่าเฉลี่ยหรือมัธยฐานของหมู่เลือด ซึ่งทำไม่ได้เพราะไม่ใช่ตัวเลข',
    limitations: 'ฐานนิยมบอกแค่ค่าที่พบบ่อย ไม่ได้บอกภาพรวมของข้อมูลทั้งหมด',
  },
];

export const CASE_SCENES: Record<string, CaseScene> = {
  'CASE 01': {
    bg: 'case01-bg.webp', detective: 'ผู้กองหญิง',
    dataText: '12, 14, 13, 15, 1000',
    answers: ['median'],
    teacherAsk: 'ข้อมูลชุดนี้มีค่าไหนแปลกไหม',
    explain: 'ค่าที่สูงมาก (1,000) ดึงค่าเฉลี่ยให้สูงขึ้นเป็น 210.8 ซึ่งไม่ใช่รายได้ของคนส่วนใหญ่ ส่วนมัธยฐานดูแค่ตำแหน่งตรงกลาง ได้ 14 พันบาท ใกล้กับรายได้ของคนส่วนใหญ่',
    items: [
      { name: 'กรรไกรตัดกิ่งของคนสวน', label: 'กรรไกรตัดกิ่ง', file: 'item-c1-shears.webp', value: '12 พันบาท', x: 14, y: 88, w: 4.5, rot: -30 },
      { name: 'ไม้ขนไก่ของแม่บ้าน', label: 'ไม้ขนไก่', file: 'item-c1-duster.webp', value: '14 พันบาท', x: 30, y: 68, w: 4, rot: 25 },
      { name: 'กุญแจรถของคนขับรถ', label: 'กุญแจรถ', file: 'item-c1-key.webp', value: '13 พันบาท', x: 86, y: 73, w: 3.5, rot: 60 },
      { name: 'หมวกเชฟของพ่อครัว', label: 'หมวกเชฟ', file: 'item-c1-chefhat.webp', value: '15 พันบาท', x: 44, y: 54, w: 4.5 },
      { name: 'แหวนเพชรของเจ้าของคฤหาสน์', label: 'แหวนเพชร', file: 'item-c1-ring.webp', value: '1,000 พันบาท', x: 66, y: 47, w: 3.5 },
    ],
  },
  'CASE 02': {
    bg: 'case02-bg.webp', detective: 'ผู้หมวดเอิร์ธ',
    dataText: '26, 27, 26, 28, 28, 25, 25',
    answers: ['mean', 'median'],
    teacherAsk: 'คดีนี้มีค่าแปลกเหมือนคดีที่แล้วไหม',
    explain: 'ขนาดรองเท้าใกล้เคียงกันหมด (25 ถึง 28) ไม่มีค่าผิดปกติ ค่าเฉลี่ยได้ประมาณ 26.43 และมัธยฐานได้ 26 ใกล้กันมาก จึงใช้ได้ทั้งคู่ ส่วนฐานนิยมมี 3 ค่า (25, 26, 28 ซ้ำอย่างละ 2 ครั้ง) จึงไม่ช่วยบอกขนาดที่เป็นตัวแทน',
    items: [
      { name: 'รอยเท้ารอยที่ 1', label: 'รอยเท้า 1', file: 'item-c2-footprint.webp', value: 'Size 26', x: 16, y: 82, w: 4.5, rot: -15 },
      { name: 'รอยเท้ารอยที่ 2', label: 'รอยเท้า 2', file: 'item-c2-footprint.webp', value: 'Size 27', x: 34, y: 66, w: 3.5, rot: 10 },
      { name: 'รอยเท้ารอยที่ 3', label: 'รอยเท้า 3', file: 'item-c2-footprint.webp', value: 'Size 26', x: 50, y: 88, w: 4.5, rot: -5 },
      { name: 'รอยเท้ารอยที่ 4', label: 'รอยเท้า 4', file: 'item-c2-footprint.webp', value: 'Size 28', x: 68, y: 72, w: 3.5, rot: 20 },
      { name: 'รอยเท้ารอยที่ 5', label: 'รอยเท้า 5', file: 'item-c2-footprint.webp', value: 'Size 28', x: 85, y: 84, w: 4, rot: -25 },
      { name: 'รอยเท้ารอยที่ 6', label: 'รอยเท้า 6', file: 'item-c2-footprint.webp', value: 'Size 25', x: 25, y: 76, w: 3.5, rot: 35 },
      { name: 'รอยเท้ารอยที่ 7', label: 'รอยเท้า 7', file: 'item-c2-footprint.webp', value: 'Size 25', x: 60, y: 70, w: 3.5, rot: -30 },
    ],
  },
  'CASE 03': {
    bg: 'case03-bg.webp', detective: 'แพทย์นิติเวช',
    dataText: 'A, B, O, O, A, O',
    answers: ['mode'],
    teacherAsk: 'แพทย์นิติเวชต้องการหาอะไร',
    explain: 'หมู่เลือดเป็นข้อมูลหมวดหมู่ บวกหรือเรียงลำดับแบบตัวเลขไม่ได้ จึงหาค่าเฉลี่ยและมัธยฐานไม่ได้ ใช้ฐานนิยม: หมู่ O พบ 3 ครั้ง มากที่สุด',
    items: [
      { name: 'หลอดเลือดผู้ต้องสงสัยคนที่ 1', label: 'หลอดเลือด 1', file: 'item-c3-tube.webp', value: 'หมู่ A', x: 47, y: 33, w: 1.5, rot: 0 },
      { name: 'หลอดเลือดผู้ต้องสงสัยคนที่ 2', label: 'หลอดเลือด 2', file: 'item-c3-tube.webp', value: 'หมู่ B', x: 15, y: 52, w: 1.5, rot: 70 },
      { name: 'หลอดเลือดผู้ต้องสงสัยคนที่ 3', label: 'หลอดเลือด 3', file: 'item-c3-tube.webp', value: 'หมู่ O', x: 60, y: 52, w: 1.5, rot: -75 },
      { name: 'หลอดเลือดผู้ต้องสงสัยคนที่ 4', label: 'หลอดเลือด 4', file: 'item-c3-tube.webp', value: 'หมู่ O', x: 30, y: 88, w: 1.5, rot: 80 },
      { name: 'หลอดเลือดผู้ต้องสงสัยคนที่ 5', label: 'หลอดเลือด 5', file: 'item-c3-tube.webp', value: 'หมู่ A', x: 80, y: 92, w: 1.5, rot: -60 },
      { name: 'หลอดเลือดผู้ต้องสงสัยคนที่ 6', label: 'หลอดเลือด 6', file: 'item-c3-tube.webp', value: 'หมู่ O', x: 88, y: 55, w: 1.5, rot: 20 },
    ],
  },
};
