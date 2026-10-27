# ART PROMPTS — Math Detective

วิธีใช้: ทุก prompt ให้ **ต่อท้ายด้วย STYLE** เสมอ เพื่อให้ทุกภาพเป็นชุดเดียวกัน
บันทึกไฟล์ตามชื่อในวงเล็บ ไว้ที่ `public/assets/` (ดูตาราง **E** ว่าไฟล์ไหนเกมดึงไปใช้ ไฟล์ที่ไม่มี เกมใช้ภาพวาดโค้ดเดิมแทน)
ตัวละคร/ไอเทม: สั่งพื้นหลังโปร่งใส (หรือพื้นขาวล้วนแล้วลบพื้นทีหลัง) ส่งออก `.webp` หรือ `.png`

## STYLE (ต่อท้ายทุก prompt)

```
Thai children's comic-book illustration style, bold black ink outlines, halftone dot shading,
vibrant saturated colors (deep navy #0B1B3F, teal, crimson red, warm gold lamplight #F5C04A, cream),
expressive cartoon faces with big eyes, playful mystery mood, clean flat background areas,
no text, no letters, no watermark
```

ตัวละครทุกภาพ ให้ต่อท้ายเพิ่ม:
```
full body, character sheet, same character in every image, isolated on plain white background
```

---

## A. ฉาก (Backgrounds) — 16:9, 1920×1080

**A1 สำนักงานนักสืบ (hq-bg.webp)**
```
Cozy detective office at night, rainy window on the right, glowing desk lamp, wooden desk with
case folders and magnifying glass, cork evidence board with bar charts, number cards and red string,
bookshelf with an owl perch, no people, leave the center-left area clear for UI
```

**A2 หน้าเปิดเกม / ไตเติล (title-bg.webp)**
```
Dramatic comic cover composition, diagonal comic panels, giant magnifying glass revealing numbers
and a bar chart, rain and city lights of a stylized city made of numbers, empty space top-left for a logo
```

**A3 นครข้อมูล ภาพมุมกว้าง (city-bg.webp)**
```
Whimsical night city where buildings are shaped like bar charts and number blocks, streetlights,
rain puddles reflecting gold light, a clock tower with a number dial
```

**A4 ห้องเรียน ม.2 (case01-bg.webp)** — CASE 01 คะแนนสอบที่หายไป
```
Thai secondary school classroom after hours, old archive shelves, a torn score notebook on a desk,
scattered paper, moonlight through window
```

**A5 ร้านรองเท้า (case02-bg.webp)** — CASE 02 ร้านรองเท้าปริศนา
```
Small Thai shoe shop interior, shelves of colorful sneakers sorted by size, one shelf noticeably empty,
receipts pinned at the counter
```

**A6 ตลาดนัด (case03-bg.webp)** — CASE 03 รายได้ที่ผิดปกติ
```
Thai night market with seven stalls, six small food and craft stalls and one huge glowing
electronics stall that towers over the others, a suspicious dark shadow hiding behind it
```

**A7 ป้ายรถเมล์ (case04-bg.webp)** — CASE 04 เวลารถมาไม่ตรงเวลา
```
Thai city bus stop in the rain, bus number 8 arriving in the distance, a big round clock,
bus tickets on the bench
```

**A8 ห้องชั่งน้ำหนัก (case05-bg.webp)** — CASE 05 ฐานนิยมที่ไม่มีใครพบ
```
School nurse room with a scale and six different student backpacks lined up, each a different size
```

**A9 ห้องสมุด (case06-bg.webp)** — CASE 06 สองค่าที่ปรากฏบ่อยเท่ากัน
```
Cozy city library, tall bookshelves, two stacks of library cards of exactly equal height on a table
```

**A10 สนามบาส (case07-bg.webp)** — CASE 07 หลักฐานจำนวนคู่
```
Indoor school basketball court, a height measuring wall chart, a camera on a tripod set up for a team photo
```

**A11 ห้องประชุมสภาเมือง (case08-bg.webp)** — CASE 08 คดีใหญ่แห่งนครข้อมูล
```
Grand city council hall of the number city, big map on the wall with nine houses in town and one
far outside, dramatic lighting, a dark shadow looming at the window
```

**A12 ฉากจบ / ฉลองปิดคดี (final-bg.webp)**
```
Rooftop of the number city at sunrise after rain, confetti, golden light, case files tied with ribbon
```

---

## B. ตัวละคร — 1:1 หรือ 3:4

**B1 มีนา (Mina) — นักสืบหลัก (char-mina.webp)**
```
Thai girl detective about 13 years old, short black bob hair, big curious eyes, navy detective cape
with gold buttons, teal scarf, holding a large magnifying glass, confident smile
```
ท่าเพิ่ม: `pose: opening a case folder, surprised` / `pose: thinking, hand on chin` / `pose: cheering, case solved`

**B2 โค้ดี้ (Cody) — นกฮูกผู้ช่วย (char-cody.webp)**
```
Small round owl sidekick, teal and cream feathers, oversized round glasses, tiny detective hat,
holding a pencil and notepad, friendly and smart
```
ท่าเพิ่ม: `pose: talking, wing raised` / `pose: confused, question marks` / `pose: happy flying`

**B3 คุณออร์เดอร์ (Order) — ผู้ส่งคดี (char-order.webp)**
```
Elderly kind archivist gentleman, round spectacles, grey mustache, brown vest with a pocket watch,
holding a sealed envelope, warm mysterious smile
```

**B4 เงาค่าสุดโต่ง (Outlier Shadow) — ตัวร้าย (char-outlier.webp)**
```
Mischievous shadow villain made of dark purple-black smoke, glowing red eyes, a long stretched arm
pulling a bar chart out of shape, sneaky grin, not scary for kids
```

**B5 ตัวประกอบ (ใช้ซ้ำได้)**
- `char-shopkeeper.webp` — `cheerful Thai shoe shop owner, apron, holding a receipt`
- `char-vendor.webp` — `Thai market vendor auntie, apron, holding coins, complaining expression`
- `char-photographer.webp` — `young photographer with a camera and cap`
- `char-students.webp` — `group of five Thai middle school students in uniform, different heights`

---

## C. ไอเทม / หลักฐาน — 1:1, 512×512, พื้นโปร่งใส

| ไฟล์ | prompt |
|---|---|
| `item-envelope.webp` | `sealed case envelope with red wax seal and a CASE stamp shape, no text` |
| `item-folder.webp` | `manila detective case folder, slightly open, papers peeking out` |
| `item-magnifier.webp` | `big brass magnifying glass with shiny lens` |
| `item-document.webp` | `old paper document with table lines and number rows, coffee stain` |
| `item-note.webp` | `yellow sticky note with handwriting scribbles, no readable text` |
| `item-slip.webp` | `small torn paper slip / receipt` |
| `item-photo.webp` | `polaroid photo with a paperclip, blank image area` |
| `item-hint-1.webp` | `small glowing bronze key` |
| `item-hint-2.webp` | `glowing silver key` |
| `item-hint-3.webp` | `glowing gold key` |
| `item-stamp.webp` | `red rubber stamp mark, round, CASE CLOSED style shape, no text` |
| `item-badge.webp` | `gold detective star badge` |
| `item-trophy.webp` | `gold trophy shaped like a magnifying glass` |
| `item-scale.webp` | `blue and white bathroom scale` |
| `item-shoe.webp` | `colorful sneaker` |
| `item-bus-ticket.webp` | `small bus ticket with punch hole` |
| `item-library-card.webp` | `library borrowing card` |

---


## D. คลิปคัตซีน (Video)

**สเปกทุกคลิป:** 16:9, 1920×1080 (หรือ 1280×720), 5–8 วินาที, `.mp4` (H.264), ไม่เกิน ~8 MB, **ไม่มีเสียง** (เกมเล่นแบบปิดเสียงเสมอ)
**เครื่องมือ:** Runway, Kling, Pika, Luma, Sora — ใช้โหมด **image-to-video**

**วิธีทำ:**
1. ทำภาพ "เฟรมแรก" ก่อน: วางตัวละคร (B) ลงบนฉาก (A) ด้วยเครื่องมือภาพ หรือ Photoshop/Canva ตามช่อง "เฟรมแรก"
2. อัปโหลดเฟรมแรก แล้วใส่ prompt ของคลิป ต่อท้ายด้วย MOTION STYLE
3. ถ้าเครื่องมือรองรับ "end frame" ให้ใส่ภาพเฟรมสุดท้ายด้วย ตัวละครจะเพี้ยนน้อยลง

**MOTION STYLE (ต่อท้ายทุกคลิป):**
```
comic book style animation, bold ink outlines and halftone shading stay consistent,
slow cinematic camera, characters keep the same face and outfit as the reference image,
no text, no letters, no subtitles, no logo, last 1 second holds still
```

**ข้อควรรู้:** เกมวางข้อความ ตราประทับ และกล่องบทพูดทับคลิป ให้เว้นกลางจอและครึ่งล่างให้โล่งหรือมืดพอ ตัวละครหลักควรอยู่ซ้ายหรือขวา

---

### D1 เปิดเกม — `cut-intro.mp4`
- **เล่นตอน:** หน้าแรก หลังกด "เปิดแฟ้มคดี" (ชื่อเกมและบทพูดโค้ดี้ขึ้นทับ)
- **ฉาก:** `hq-bg.webp` (A1)
- **ตัวละคร:** `char-mina.webp` (B1), `char-cody.webp` (B2)
- **อุปกรณ์:** `item-envelope.webp`
- **เฟรมแรก:** สำนักงานมืด โคมไฟยังดับ โค้ดี้เกาะชั้นหนังสือขวาบน มีนายังไม่อยู่ในภาพ
- **เฟรมสุดท้าย:** มีนายืนซ้าย ถือซองคดีที่เปิดแล้ว โคมไฟสว่าง
```
Night detective office, rain streaks run down the window, the brass desk lamp flickers then glows warm gold,
a sealed envelope with red wax seal drops from above and lands on the desk, the girl detective in a navy cape
walks in from the left and picks up the envelope, she opens it with a surprised smile,
the owl on the bookshelf blinks and tilts its head, slow dolly-in toward the desk
```

### D2 รับคดี — `cut-case-open.mp4`
- **เล่นตอน:** เริ่มคดี 01, 02, 04, 05, 06, 07 (ชื่อคดีและบทพูดคุณออร์เดอร์ขึ้นทับ)
- **ฉาก:** `hq-bg.webp` (A1) ทำให้มืดและเบลอลง
- **ตัวละคร:** `char-order.webp` (B3)
- **อุปกรณ์:** `item-envelope.webp`, `item-folder.webp`
- **เฟรมแรก:** คุณออร์เดอร์ยืนขวา ถือซองปิดผนึก โต๊ะไม้อยู่ด้านหน้า
- **เฟรมสุดท้าย:** แฟ้มคดีเปิดกลางโต๊ะ กระดาษหลักฐานกางออก
```
Kind old archivist with round spectacles and grey mustache slides a sealed envelope across a wooden desk
toward the camera, the red wax seal cracks open, a manila case folder flips open and evidence papers fan out,
warm lamplight, dust particles float, camera slowly pushes in on the folder
```

### D3 เงาค่าสุดโต่งโผล่ — `cut-outlier.mp4`
- **เล่นตอน:** เริ่ม CASE 03 รายได้ที่ผิดปกติ
- **ฉาก:** `case03-bg.webp` (A6 ตลาดนัด)
- **ตัวละคร:** `char-outlier.webp` (B4)
- **อุปกรณ์:** กราฟแท่งลอย (ไม่ต้องมีไฟล์ ให้ AI วาด)
- **เฟรมแรก:** ตลาดนัดกลางคืน 7 แผง แผงเครื่องใช้ไฟฟ้าใหญ่ด้านขวา มีควันดำจาง ๆ ด้านหลัง
- **เฟรมสุดท้าย:** เงาหายเป็นควัน กราฟแท่งหนึ่งแท่งยังสูงผิดปกติค้างอยู่
```
Thai night market with seven stalls under string lights, behind the giant glowing electronics stall
dark purple smoke rises and forms the shadow villain with glowing red eyes, it grabs a floating bar chart
and stretches one bar much taller than the others, grins mischievously and dissolves into smoke,
playful spooky not scary, camera slowly tilts up
```

### D4 คดีสุดท้าย — `cut-final-boss.mp4`
- **เล่นตอน:** เริ่ม CASE 08 คดีใหญ่แห่งนครข้อมูล
- **ฉาก:** `case08-bg.webp` (A11 ห้องประชุมสภา)
- **ตัวละคร:** `char-outlier.webp` (B4), `char-mina.webp` (B1)
- **อุปกรณ์:** `item-magnifier.webp`
- **เฟรมแรก:** ห้องสภา แผนที่บ้านนักเรียนบนผนัง (9 หลังในเมือง 1 หลังไกลออกไป) เงาอยู่ที่หน้าต่าง
- **เฟรมสุดท้าย:** มีนายืนซ้าย ยกแว่นขยาย ลำแสงทองส่องไล่เงาถอยไป
```
Grand council hall of the number city, the lights dim, the smoke shadow villain looms large over the wall map
and stretches toward the one far-away house, the girl detective steps in from the left and raises a big brass
magnifying glass, a beam of golden light shines through the lens and pushes the shadow back,
dramatic but kid-friendly, slow push-in
```

### D5 ปลดล็อกคำใบ้ — `cut-hint.mp4`
- **เล่นตอน:** ทุกครั้งที่ทีมเปิดคำใบ้ (ข้อความคำใบ้ขึ้นทับกลางจอ)
- **ฉาก:** พื้นหลังสีกรมท่าเรียบ (ไม่ต้องมีไฟล์)
- **ตัวละคร:** `char-cody.webp` (B2)
- **อุปกรณ์:** `item-hint-3.webp` (กุญแจทอง), `item-magnifier.webp`
- **เฟรมแรก:** โค้ดี้ด้านล่างซ้าย พื้นหลังมืด
- **เฟรมสุดท้าย:** กุญแจทองเล็ก ๆ ลอยด้านบน มีประกายรอบ ๆ (กลางจอต้องโล่งไว้ให้ข้อความ)
```
Dark navy background with soft halftone glow, the small round owl with big glasses flaps its wings,
a magnifying glass sweeps across the frame, a small glowing golden key appears and floats upward,
sparkles burst outward, gentle magical mood
```

### D6 ตอบถูก / ปิดคดี — `cut-correct.mp4`
- **เล่นตอน:** ทีมตอบถูก (ตรา "คดีคลี่คลาย" และคะแนนขึ้นทับ)
- **ฉาก:** `hq-bg.webp` (A1)
- **ตัวละคร:** `char-mina.webp` (B1 ท่าดีใจ), `char-cody.webp` (B2 ท่าบิน)
- **อุปกรณ์:** `item-folder.webp`, `item-stamp.webp`
- **เฟรมแรก:** มีนาอยู่ซ้าย ถือตรายาง แฟ้มคดีบนโต๊ะ โค้ดี้อยู่ขวา
- **เฟรมสุดท้าย:** ทั้งคู่ดีใจ แสงทองฟุ้ง กระดาษสีโปรย
```
The girl detective slams a red rubber stamp onto the case folder, a burst of golden light and confetti,
the owl jumps and cheers with wings up, red string on the evidence board lights up connecting the clues,
joyful celebration, quick camera shake on the stamp then slow zoom out
```

### D7 ตอบผิด — `cut-wrong.mp4`
- **เล่นตอน:** ทีมตอบผิด (บทพูดให้กำลังใจของโค้ดี้ขึ้นทับด้านล่าง)
- **ฉาก:** `hq-bg.webp` (A1)
- **ตัวละคร:** `char-mina.webp` (B1 ท่าคิด), `char-cody.webp` (B2 ท่างง)
- **อุปกรณ์:** `item-document.webp`
- **เฟรมแรก:** มีนายืนหน้าโต๊ะ กระดาษหลักฐานกองบนโต๊ะ
- **เฟรมสุดท้าย:** มีนาจับคาง ยิ้มพร้อมลองใหม่ โค้ดี้มีเครื่องหมายคำถามเหนือหัว
```
A gust of wind blows evidence papers off the desk, the girl detective scratches her head then puts
her hand on her chin thinking, a small smile of determination, the owl tilts its head with a floating
question mark, light comedic mood, encouraging not sad, gentle camera sway
```

### D8 ฉากจบ — `cut-ending.mp4`
- **เล่นตอน:** จบครบ 8 คดีในโหมดฝึก (คะแนนรวมขึ้นทับ)
- **ฉาก:** `final-bg.webp` (A12)
- **ตัวละคร:** `char-mina.webp`, `char-cody.webp`, `char-order.webp`
- **อุปกรณ์:** `item-folder.webp`, `item-trophy.webp`
- **เฟรมแรก:** ดาดฟ้ายามรุ่งเช้า ทั้งสามยืนเรียงกันครึ่งล่างของภาพ
- **เฟรมสุดท้าย:** มุมกว้างเห็นทั้งเมือง ตัวละครเล็กลงด้านล่าง ท้องฟ้าโล่ง
```
Sunrise over the number city after rain, the girl detective, the owl and the old archivist stand on a rooftop
and wave, a stack of case folders tied with ribbon glows gold, confetti drifts,
camera slowly pulls back and rises to a wide shot of the city
```

---

## E. ไฟล์ที่เกมใช้ (วางที่ `public/assets/` ชื่อต้องตรงทุกตัวอักษร)

| ไฟล์ | แสดงที่ |
|---|---|
| `title-bg.webp` | หน้าแรกก่อนกดเริ่ม |
| `hq-bg.webp` | ฉากสำนักงาน (หน้าแรก, HQ, Lobby) |
| `case01-bg.webp` … `case08-bg.webp` | พื้นหลังคัตซีนเริ่มคดีแต่ละคดี |
| `final-bg.webp` | คัตซีนจบเกม |
| `char-mina.webp`, `char-cody.webp`, `char-order.webp`, `char-outlier.webp` | ตัวละครทุกจุดในเกม (แทนภาพวาดโค้ด) |
| `item-document.webp`, `item-note.webp`, `item-slip.webp`, `item-photo.webp` | ไอคอนการ์ดหลักฐาน |
| `cut-intro.mp4` | D1 |
| `cut-case-open.mp4` / `cut-outlier.mp4` / `cut-final-boss.mp4` | D2 / D3 (CASE 03) / D4 (CASE 08) |
| `cut-hint.mp4` | D5 |
| `cut-correct.mp4` / `cut-wrong.mp4` | D6 / D7 |
| `cut-ending.mp4` | D8 |

- ไฟล์อื่นใน A–C (เช่น `city-bg`, ตัวประกอบ, กุญแจ, ถ้วยรางวัล) เป็นวัตถุดิบทำเฟรมแรกของคลิป เกมไม่ได้แสดงตรง ๆ
- ภาพตัวละครและไอเทมต้องเป็น **พื้นโปร่งใส** ไม่งั้นจะเห็นกรอบขาวในเกม
- ไฟล์ไหนไม่มี เกมใช้ภาพวาดโค้ดเดิมแทน ไม่พัง
- ถ้าปิด "แอนิเมชัน" ในหน้าตั้งค่า เกมจะไม่เล่นคลิป
