# MATH DETECTIVE: THE MYSTERY OF CENTRAL TENDENCY
## คดีปริศนาค่ากลางของข้อมูล

เว็บเกมการเรียนรู้คณิตศาสตร์ ม.2 เรื่องค่ากลางของข้อมูล (ค่าเฉลี่ยเลขคณิต มัธยฐาน ฐานนิยม) สำหรับคาบ 55 นาที
ครูคุมเกมจาก iPad ฉายจอผ่านโปรเจกเตอร์ นักเรียนแบ่งทีมเข้าห้องด้วย QR Code บนโทรศัพท์

React + TypeScript + Vite + Tailwind + Framer Motion + Supabase (Auth, Postgres, Realtime, Storage) · Deploy บน GitHub Pages

---

## สถานะของระบบ (อ่านก่อน)

| ส่วน | สถานะ |
|---|---|
| Intro / Cutscene / Animation / โหมดฝึก 8 คดี | ใช้งานได้ทันที ไม่ต้องมีฐานข้อมูล (ทดสอบในเบราว์เซอร์แล้ว) |
| Math engine + คลังคดี | มี unit test 15 ข้อ (`npm test`) ตรวจว่าเฉลยทุกคดีตรงกับข้อมูล |
| ห้องเรียนหลายทีม, Realtime, คะแนน, Gallery, Exit Ticket, Question Editor | เชื่อม Supabase โปรเจกต์ `nuzopewpmnrerjddvrqz` แล้ว (รัน schema, เปิด anonymous sign-in) ทดสอบแล้วเฉพาะนักเรียน sign-in + RPC `room_status` **ยังไม่ได้ทดสอบฝั่งครูและ Realtime** ต้องสร้างบัญชีครูก่อน (ดูหัวข้อสร้างบัญชีครู) |
| ค้นหาข้อมูลในฉาก (Hidden-object) | แต่ละคดีไม่บอกตัวเลข นักเรียนต้องแตะหาไอเทมที่ซ่อนในภาพฉากให้ครบก่อนโจทย์จะขึ้น ตำแหน่งเหมือนกันทุกเครื่อง |

ถ้ายังไม่ได้ตั้งค่า Supabase เว็บจะแสดง “ต้องตั้งค่าฐานข้อมูลก่อน (Setup Required)” และไม่แสดงข้อมูลจำลอง

---

## โครงสร้างไฟล์

```
math-detective/
├─ src/
│  ├─ lib/
│  │  ├─ math.ts            # calculateMean/Median/Modes, sortData, generateDataset, evaluateAnswer, calculateScore
│  │  ├─ math.test.ts       # unit tests (vitest)
│  │  ├─ cases.ts           # คลังคดี 8 คดี + answerKey() คำนวณเฉลยจากข้อมูลเสมอ
│  │  ├─ api.ts             # เรียก RPC/ตาราง Supabase + useRealtime
│  │  ├─ supabase.ts        # client (null ถ้าไม่มี env) + ข้อความ error ภาษาไทย
│  │  ├─ settings.tsx       # ปิดแอนิเมชัน / ความเร็ว / ปิดเสียง / prefers-reduced-motion
│  │  ├─ sound.ts           # เสียงสังเคราะห์ WebAudio (ไม่มีไฟล์เสียงให้โหลดพัง)
│  │  └─ csv.ts
│  ├─ components/
│  │  ├─ cinema.tsx         # CinematicSequence, SceneLayer, HQScene, CharacterSprite, DialogueBox,
│  │  │                     # EvidenceReveal, MagnifyingGlass, CaseStamp, AnimatedScore, SkipCutsceneButton
│  │  ├─ mathviz.tsx        # DataSortingAnimation, ModeGrouping, CalculationStepReveal
│  │  ├─ characters.tsx     # มีนา, โค้ดี้, คุณออร์เดอร์, เงาค่าสุดโต่ง (SVG วาดด้วยโค้ด)
│  │  ├─ Investigation.tsx  # หน้าสืบสวนหลัก: หลักฐาน ชุดข้อมูล คำใบ้ 3 ระดับ คำตอบ เหตุผล
│  │  ├─ CaseResult.tsx     # cutscene ตอบถูก/ผิด เปิดคดี สรุปคดี + รายงานผล
│  │  ├─ RoomQR.tsx         # QR จาก URL จริง + คัดลอก/ดาวน์โหลด
│  │  └─ ui.tsx
│  └─ pages/                # Intro, HQ, Settings, Practice, Join, Play, Teacher, TeacherSession,
│                           # Editor, Lobby, Scoreboard, Gallery, ExitTicket, History
├─ supabase/schema.sql      # ตาราง, index, RLS, RPC, trigger, realtime, storage bucket + policies
├─ public/assets/           # (ไม่บังคับ) วาง hq-bg.webp เป็นภาพฉากจริง
├─ .github/workflows/deploy.yml
└─ .env.example
```

### เส้นทางหน้าเว็บ (HashRouter)
| หน้า | URL |
|---|---|
| A. Cinematic Intro | `#/` |
| B. Detective HQ | `#/hq` |
| C. Teacher Dashboard | `#/teacher` |
| D. Question Editor | `#/teacher/editor/:setId` |
| E. Classroom Lobby (โปรเจกเตอร์) | `#/lobby/:sessionId` |
| F. QR Join | `#/join/:ROOMCODE` |
| G–I. Investigation / Clue / Answer | `#/play/:sessionId` (และโหมดฝึก `#/practice/:n`) |
| J. Scoreboard | `#/scoreboard/:sessionId` |
| K. Case Result / Cutscene | อยู่ในหน้า play / practice หลังส่งคำตอบ |
| L. Evidence Gallery | `#/gallery/:sessionId` |
| M. Exit Ticket | `#/exit/:sessionId` |
| N. Settings | `#/settings` |
| O. Session History | `#/teacher/history` |
| ควบคุมห้องสด (ครู) | `#/teacher/session/:sessionId` |

---

## 1. ติดตั้งและรันบนเครื่อง

ต้องมี Node.js 20 ขึ้นไป

```bash
npm install
```

```bash
cp .env.example .env
```

แก้ `.env` ใส่ค่าจาก Supabase (ขั้นตอนที่ 2) แล้วรัน

```bash
npm run dev
```

ทดสอบและ build:

```bash
npm test
```

```bash
npm run build
```

---

## 2. ตั้งค่า Supabase (Backend)

1. สมัคร/เข้า https://supabase.com → **New project**
2. **SQL Editor** → New query → วางเนื้อหาไฟล์ `supabase/schema.sql` ทั้งไฟล์ → **Run**
   (รันซ้ำได้ ถ้าอัปเดตเวอร์ชันใหม่)
3. **Authentication → Sign In / Providers**
   - เปิด **Email** (สำหรับครู)
   - เปิด **Allow anonymous sign-ins** (สำหรับนักเรียน ไม่ต้องสมัครบัญชี)
   - แนะนำปิด “Allow new users to sign up” ของ Email เพื่อไม่ให้คนอื่นสมัครเอง (สร้างบัญชีครูจาก Dashboard แทน)
4. **Project Settings → API** คัดลอก
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`
   - **ห้ามใช้ `service_role` key ในเว็บเด็ดขาด**
5. ตรวจว่า bucket `gallery` ถูกสร้างที่ **Storage** (private, จำกัด 5 MB, รับเฉพาะ jpeg/png/webp)
6. ตรวจ **Database → Publications → supabase_realtime** ว่ามีตาราง game_sessions, teams, submissions, hint_unlocks, work_gallery, exit_ticket_responses

### สร้างบัญชีครู
สิทธิ์ครูไม่สามารถตั้งเองจากหน้าเว็บได้ (กันนักเรียนยกระดับสิทธิ์ตัวเอง)

1. **Authentication → Users → Add user → Create new user** ใส่อีเมลและรหัสผ่านของครู (ติ๊ก Auto Confirm)
2. **SQL Editor** รัน:
   ```sql
   insert into teacher_profiles (user_id, display_name)
   select id, 'ครูเอิร์ท' from auth.users where email = 'teacher@example.com';
   ```
3. เข้า `#/teacher` ด้วยอีเมล/รหัสผ่านนั้น → กด **นำเข้าคลังคดีเริ่มต้น** เพื่อได้ชุดโจทย์ 8 คดี (Seed Data)

### โมเดลความปลอดภัย (สรุป)
- นักเรียน = anonymous user ผูกกับทีมผ่าน `team_members` ซึ่งสร้างได้ทาง `join_room()` เท่านั้น
- เฉลย (`question_answers`) และคำใบ้ (`clues`) อ่านได้เฉพาะครูเจ้าของ นักเรียนได้รับผ่าน RPC `get_hints` / `get_feedback` ตามเงื่อนไข (เปิดทีละระดับ, หลังส่งคำตอบ หรือเมื่อครูเปิดเฉลย)
- การส่งคำตอบและให้คะแนนทำใน `submit_answer()` ฝั่งฐานข้อมูล นักเรียนไม่มีสิทธิ์ insert/update ตาราง submissions โดยตรง
- `unique(team_id, question_id)` + `client_submission_id` กันส่งซ้ำ กดซ้ำ/ส่งใหม่หลังเน็ตหลุดจะได้ผลเดิม
- ครูแก้คะแนนเหตุผล/สื่อสารได้ trigger คำนวณคะแนนรวมใหม่และบันทึกใน `score_events`
- Gallery: นักเรียนอัปโหลดได้เฉพาะโฟลเดอร์ `<session>/<team ของตัวเอง>/` เห็นผลงานคนอื่นเฉพาะที่ครูอนุมัติ แก้ไขผลงานแล้วต้องรออนุมัติใหม่ ภาพเปิดด้วย signed URL อายุ 1 ชั่วโมง
- ใช้ชื่อทีมแทนชื่อจริง; Exit Ticket ใช้ “เลขที่/ชื่อเล่น”

---

## 3. Deploy ด้วย GitHub Pages

1. สร้าง repository ใหม่บน GitHub (เช่น `math-detective`) แล้ว push โค้ด:
   ```bash
   git init
   ```
   ```bash
   git add . && git commit -m "Math Detective"
   ```
   ```bash
   git branch -M main && git remote add origin https://github.com/YOUR-USERNAME/math-detective.git && git push -u origin main
   ```
2. GitHub → **Settings → Secrets and variables → Actions**
   - Secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
   - Variables: `VITE_PUBLIC_SITE_URL` = `https://YOUR-USERNAME.github.io/math-detective/`
3. **Settings → Pages → Source: GitHub Actions**
4. ทุกครั้งที่ push ไป `main` workflow `.github/workflows/deploy.yml` จะ test → build → deploy
5. Supabase → **Authentication → URL Configuration** ใส่ Site URL เป็น URL ของ GitHub Pages

`vite.config.ts` ใช้ `base: './'` + HashRouter จึงทำงานใต้ path ของ repo ได้โดยไม่ต้องตั้ง 404.html

---

## 4. ทดสอบ QR Code จากมือถือจริง

QR สร้างจาก `VITE_PUBLIC_SITE_URL` (ถ้าไม่ตั้ง ใช้ URL ของหน้าปัจจุบัน) รูปแบบ `https://YOUR-USERNAME.github.io/math-detective/#/join/ROOMCODE`
ถ้าเปิดจาก localhost ระบบจะเตือนว่ามือถือเปิดลิงก์ไม่ได้ ให้ทดสอบจากเว็บที่ deploy แล้ว

---

## 5. รายการตรวจสอบ End-to-End (ต้องผ่านก่อนใช้สอนจริง)

อุปกรณ์: iPad ครู 1 เครื่อง, โทรศัพท์ A และ B (คนละเครื่อง), คอมพิวเตอร์ต่อโปรเจกเตอร์

- [ ] iPad: เข้า `#/teacher` ล็อกอินครู → นำเข้าคลังคดี → สร้างห้อง ได้รหัส 6 ตัวและ QR
- [ ] โปรเจกเตอร์: เปิด “จอโปรเจกเตอร์” QR และรหัสอ่านได้จากหลังห้อง
- [ ] โทรศัพท์ A สแกน QR → ตั้งทีม “ทีมเอ” → เข้าได้ (ข้อความสำเร็จขึ้นหลัง backend ยืนยันเท่านั้น)
- [ ] โทรศัพท์ B ตั้ง “ทีมบี” → ทั้ง iPad และโปรเจกเตอร์เห็นทีมใหม่ขึ้น **โดยไม่ต้องรีเฟรช**
- [ ] โทรศัพท์ A2 (เพื่อนในทีม) พิมพ์ชื่อ “ทีมเอ” → อยู่ทีมเดียวกัน เห็นคำใบ้ที่เพื่อนเปิดแบบ realtime
- [ ] ครูปิดรับทีม → เครื่องใหม่ตั้งทีมใหม่ไม่ได้ (ทีมเดิมกลับเข้าได้)
- [ ] ครูกด “เริ่มเกม” → ทั้งสองโทรศัพท์เปลี่ยนเป็นหน้าคดีเอง + ตัวจับเวลาตรงกัน
- [ ] ทีมเอเปิดคำใบ้ 1 → 2 (เปิด 2 ก่อน 1 ไม่ได้) ทีมบีไม่เห็นคำใบ้ของทีมเอ
- [ ] ทีมเอส่งคำตอบ → iPad เห็น “ส่งแล้ว” + คำตอบ + เหตุผล ทันที; กดส่งซ้ำไม่เกิดแถวซ้ำ
- [ ] ปิด Wi-Fi โทรศัพท์ B แล้วกดส่ง → ขึ้นว่าออฟไลน์ ไม่บอกว่าสำเร็จ; เปิด Wi-Fi แล้วส่งได้
- [ ] ครูหยุดเกม → นักเรียนส่งไม่ได้; เล่นต่อ → เวลาเดินต่อจากเดิม
- [ ] ครูปรับคะแนนเหตุผล → กระดานคะแนนเปลี่ยนทันที
- [ ] ครูปิด “แสดงคะแนน” → นักเรียนเห็นเฉพาะคะแนนทีมตัวเอง
- [ ] ครูเปิดเฉลย / ภารกิจถัดไป → ทุกเครื่องเปลี่ยนพร้อมกัน
- [ ] จบเกม → นักเรียนเห็นลิงก์ส่งผลงาน / Exit Ticket
- [ ] โทรศัพท์ A ถ่ายรูปอัปโหลด (เห็น % progress) → ไฟล์ .pdf หรือ >5MB ถูกปฏิเสธพร้อมข้อความ
- [ ] iPad อนุมัติผลงาน → โทรศัพท์ B เห็นผลงานทีมเอ (ก่อนอนุมัติต้องไม่เห็น) → แสดงบนโปรเจกเตอร์ได้
- [ ] Exit Ticket จากโทรศัพท์ 2 เครื่อง → iPad เห็น 2 แถว ดาวน์โหลด CSV เปิดใน Excel ภาษาไทยไม่เพี้ยน
- [ ] ดาวน์โหลด CSV คะแนน / ผลงาน / ประวัติการสอน
- [ ] ทดสอบ RLS: ในคอนโซลเบราว์เซอร์ของนักเรียน ลอง `select` ตาราง `question_answers` ต้องได้ 0 แถว, ลอง `update submissions` ต้องไม่สำเร็จ

---

## 6. ระบบคณิตศาสตร์และนโยบาย

- ค่าเฉลี่ย = ผลรวม ÷ จำนวนข้อมูล; มัธยฐานเรียงข้อมูลก่อน จำนวนคู่ใช้ค่าเฉลี่ยของสองค่ากลาง
- ฐานนิยม: รองรับ 1 ค่า / หลายค่า / ไม่มี — **ถ้าทุกค่ามีความถี่เท่ากัน ถือว่าไม่มีฐานนิยม**
- คำนวณด้วยความละเอียดเต็ม ปัดเศษตอนแสดงผลเท่านั้น (ทศนิยม 2 ตำแหน่ง); คำตอบนักเรียนคลาดเคลื่อนได้ ±0.01
- เฉลยไม่ถูกเก็บแบบคงที่: `answerKey()` คำนวณจากชุดข้อมูลทุกครั้งที่บันทึก คำใบ้ใช้ตัวแปร `{mean} {median} {modes} {sorted} {middle} ...` จึงถูกต้องเสมอแม้ครูเปลี่ยน/สุ่มข้อมูล
- คะแนนต่อภารกิจ 100: ถูกต้อง 50 · วิธีคำนวณ/ตรวจหลักฐาน 20 (เลือกค่ากลางถูก 10 + ตรวจ/ทำเครื่องหมายหลักฐาน 10) · เหตุผล 25 (ระบบให้เบื้องต้นตามความยาว ครูปรับได้) · สื่อสารในทีม 5 (ครูให้) · หักคำใบ้ตามที่ครูตั้ง (ค่าเริ่มต้น 5, ตั้ง 0 = ไม่หัก) ไม่ติดลบ · โบนัสเวลาสูงสุด 5 (ปิดเป็นค่าเริ่มต้น)
- สูตรคะแนนอยู่สองที่ต้องตรงกัน: `src/lib/math.ts calculateScore()` และ `supabase/schema.sql submit_answer()`

---

## 7. ภาพประกอบ

ฉาก ตัวละคร และหลักฐานวาดด้วย CSS/SVG แยก layer (พื้นหลัง/หน้าต่างฝน/บอร์ด/โต๊ะ/แสงโคม/ฝุ่น) จึงไม่มีภาพเสีย
ถ้าต้องการภาพฉากแบบวาดมือ (จาก prompt สร้างภาพที่เตรียมไว้) ให้บันทึกเป็น `public/assets/hq-bg.webp` (16:9, ~1920px) ระบบจะซ้อนภาพนั้นบนฉาก CSS อัตโนมัติ ถ้าโหลดไม่ได้จะกลับไปใช้ฉาก CSS

---

## 8. Backup ข้อมูล

- Supabase Dashboard → **Database → Backups** (แพ็กเกจ Pro มี daily backup)
- หรือสำรองเอง: **Project Settings → Database → Connection string** แล้วใช้
  ```bash
  pg_dump "postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres" --schema=public -Fc -f math-detective.backup
  ```
- โจทย์: ใช้ปุ่ม **Export JSON** ใน Question Editor เก็บไว้
- คะแนน/ผลงาน/Exit Ticket: ดาวน์โหลด CSV หลังจบคาบ

---

## 9. แก้ไขปัญหาเบื้องต้น

| อาการ | วิธีแก้ |
|---|---|
| หน้าเว็บขึ้น “Setup Required” | ยังไม่ได้ใส่ `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` ตอน build (เช็ก GitHub Secrets แล้ว build ใหม่) |
| นักเรียนเข้าห้องไม่ได้ “Anonymous sign-ins” | เปิด Allow anonymous sign-ins ใน Supabase Auth |
| ครูล็อกอินแล้วขึ้น “ยังไม่ได้รับสิทธิ์ครู” | รันคำสั่ง insert `teacher_profiles` ในหัวข้อสร้างบัญชีครู |
| ทีมไม่ขึ้นแบบ realtime | ตรวจ publication `supabase_realtime` มีตารางครบ; ป้ายสถานะมุมขวาบนต้องเป็น “เชื่อมต่อแล้ว” |
| QR เปิดบนมือถือไม่ได้ | ตั้ง `VITE_PUBLIC_SITE_URL` เป็น URL GitHub Pages; อย่าใช้ localhost |
| อัปโหลดรูปไม่ผ่าน | ไฟล์ต้องเป็น JPG/PNG/WEBP ไม่เกิน 5 MB (รูป HEIC จาก iPhone ให้ตั้งกล้องเป็น “Most Compatible” หรือแคปหน้าจอ) |
| แอนิเมชันกระตุกบนมือถือเก่า | ไปที่ ตั้งค่า → ปิดแอนิเมชัน หรือเลือกความเร็ว “เร็วมาก” |
| ต้องการเคลียร์คะแนนห้อง | หน้าควบคุมห้อง → “รีเซ็ตคะแนนห้องนี้” |
