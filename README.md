# Koh Kret Smart Tourism Map

แผนที่วางแผนเที่ยวเกาะเกร็ด นนทบุรี — Next.js + Tailwind, ข้อมูลภูมิศาสตร์และสถานที่ทั้งหมดมาจาก OpenStreetMap ของจริง

An interactive route-planning map of Koh Kret island, Nonthaburi. Every coordinate, the coastline,
the river and the street network are real OpenStreetMap data, not illustration.

---

## เริ่มใช้งาน / Getting started

ต้องมี **Node.js 20+**

```bash
npm install
npm run dev
```

เปิด http://localhost:3000

```bash
npm run build   # production build
npm start       # serve the production build
npm run lint
```

---

## สิ่งที่ทำได้ / What it does

- กรองสถานที่ตามหมวดหมู่ 6 หมวด และค้นหาด้วยชื่อไทย/อังกฤษ
- เลือกเส้นทางแนะนำ 6 เส้น — เส้นทางเดินตามถนนจริง พร้อมระยะทางเดินจริง
- ป็อปอัพรายละเอียดสถานที่ พร้อมลิงก์นำทางไป Google Maps (ไม่ต้องใช้ API key)
- ซูม/แพนแผนที่ (ล้อเมาส์ ลาก ดับเบิลคลิก หรือปุ่ม)
- แผนการเดินทางแบบไทม์ไลน์ เลื่อนแนวนอนได้

---

## หลักการที่ยึดไว้ / Ground rules this project holds

อ่าน `PRODUCT.md` (กลยุทธ์) และ `DESIGN.md` (ระบบภาพ) ก่อนแก้ — ทั้งสองไฟล์เป็นสัญญาที่โค้ดยึดอยู่

1. **ข้อมูลจริงเท่านั้น** ไม่มีสถานที่ปลอม ไม่มีเวลาเปิด-ปิดที่เดาเอง ไม่มี QR หลอกตา
   ถ้าหาแหล่งอ้างอิงไม่ได้ ให้เว้นว่างแล้วออกแบบ empty state — อย่าแต่งขึ้น
   สถานที่ที่หลักฐานอ่อนกว่าตัวอื่นให้ติด `dataNote` บอกผู้อ่านตรงๆ (ดู `wat-chan`)
2. **ตัวเลขที่แสดงคือจำนวนจริง** จำนวนต่อหมวดนับจากชุดข้อมูลจริง ไม่ใช่เลขประกอบภาพ
3. **หมุดไม่ขยับจากพิกัดจริง** สถานที่ที่อยู่ใกล้กันจะซ้อนกันจริงๆ แก้ด้วยตัวเลข `+N` และลิสต์ในป็อปอัพ
   ไม่ใช่ด้วยการเลื่อนหมุดให้ดูสวย
4. **Contrast วัดจริง ไม่ใช่กะเอา** body text ตั้งเป้า ≥7:1 (เข้มกว่า WCAG AA) เพราะใช้กลางแดด
   รัน `node scripts/check-contrast.mjs` หลังแตะสีทุกครั้ง
5. **Animation ต้องสื่อสถานะ** ไม่ใช่ประดับ และทุกตัวต้องระบุ end state ของ `prefers-reduced-motion`

---

## โครงสร้าง / Layout

```
app/            หน้าเว็บ, layout, globals.css (design tokens + motion + map layer styles)
components/     UI ทั้งหมด — MapCanvas คือหัวใจ (projection, zoom, pins)
lib/
  places.ts     ★ ข้อมูลสถานที่ + หมวดหมู่ + เส้นทาง — แก้ที่นี่
  geo.ts        GENERATED — ชายฝั่ง แม่น้ำ ถนน projection
  route-paths.ts GENERATED — เส้นทางเดินตามถนน + ระยะทาง
  icons.tsx     ไอคอนลายเส้นวาดเอง
  qr.ts         QR ของจริง (สแกนได้) ไปเว็บ อบต.เกาะเกร็ด
  maps-links.ts ลิงก์ Google Maps แบบ deep link
scripts/        ท่อข้อมูล OSM (ดูด้านล่าง)
public/         ลายพื้นหลังฝาโอ่งมอญ
```

`lib/geo.ts` และ `lib/route-paths.ts` **เป็นไฟล์ที่ถูก generate — อย่าแก้ด้วยมือ** แก้แล้วรัน script ใหม่

---

## ท่อข้อมูล / The data pipeline

ข้อมูล OSM ดิบถูก cache ไว้ใน `scripts/osm-cache/` แล้ว จึง**รัน script ได้โดยไม่ต้องต่อเน็ต**

```bash
node scripts/build-map-data.mjs        # rebuild lib/geo.ts + lib/route-paths.ts
node scripts/optimise-route-order.mjs  # solve stop order, report retraced metres
node scripts/check-contrast.mjs        # verify every colour pairing
```

### เพิ่ม/แก้สถานที่

1. หาพิกัดจริง — จาก OpenStreetMap หรือหมุด Google Maps ของร้านเอง (คลี่ short link แล้วอ่าน `!3d<lat>!4d<lng>`)
2. เช็คว่าพิกัดอยู่บนเกาะจริง (`scripts/build-map-data.mjs` มีฟังก์ชัน point-in-polygon)
3. เพิ่มใน `lib/places.ts` (ใส่แค่ `lat`/`lng` — ตำแหน่งบนจอคำนวณจาก `project()` ให้เอง)
4. ถ้าอยู่ในเส้นทางไหน เพิ่ม `stops` ในเส้นทางนั้น แล้วรัน `optimise-route-order.mjs` เพื่อหาลำดับที่เดินซ้ำน้อยที่สุด
5. รัน `build-map-data.mjs` เพื่อ regenerate เส้นทาง

### ดึงข้อมูล OSM ใหม่

`.overpassql` ทุกไฟล์อยู่ใน `scripts/osm-cache/` ใช้กับ Overpass mirror ไหนก็ได้:

```bash
curl -s -X POST --data-urlencode "data@scripts/osm-cache/roads-poly.overpassql" \
  https://overpass-api.de/api/interpreter -o scripts/osm-cache/roads-poly.json
```

> mirror หลักล่มบ่อย สำรอง: `https://maps.mail.ru/osm/tools/overpass/api/interpreter`

---

## ยังไม่ได้ทำ / Known gaps

- **ทัวร์เสมือน 360°** ยังไม่มี — QR ชี้เว็บทางการ อบต. แทน ไม่ได้อ้างว่าเป็นทัวร์
- **AI guide** ตัดออกตามที่ตกลง (ต้องมี backend + ค่า API ต่อเนื่อง)
- **สถานที่ที่ยังไม่มีพิกัดยืนยัน** เช่น กาแฟบ้านเลขที่ ๑ — มีแค่ที่อยู่ "1 หมู่ 1" ซึ่ง geocode ไม่ได้ จึงยังไม่ใส่
- **คำอธิบายขาด** ~10 จาก 19 แห่ง เพราะยังหาแหล่งอ้างอิงไม่ได้ UI แสดง empty state ตรงๆ
- **6 เส้นทาง ไม่ใช่ 8** ตามโปสเตอร์อ้างอิง — อีก 2 เส้นต้องใช้สถานที่ประเภทที่เกาะมีไม่พอ
- **เส้นทาง 1 วันยังเดินซ้ำ 20%** เป็นข้อจำกัดของเกาะ (ถนนแกนเดียว ซอยตันเข้าวัด) ไม่ใช่ของอัลกอริทึม
- **ยังไม่มี test suite** และยังไม่ได้ทดสอบบนอุปกรณ์จริงกลางแดด ซึ่งเป็นสมมติฐานหลักของธีมมืด

---

## ที่มาข้อมูล / Attribution

ชายฝั่ง แม่น้ำ โครงข่ายถนน และพิกัดสถานที่: **© OpenStreetMap contributors**, สัญญาอนุญาต
[ODbL 1.0](https://www.openstreetmap.org/copyright) — ต้องคงการอ้างอิงนี้ไว้ในหน้าเว็บ

คำอธิบายสถานที่: วิกิพีเดียไทย, อบต.เกาะเกร็ด, touronthai, dooasia และเว็บของร้านเอง

งานนี้เป็น **ต้นแบบ** ไม่ใช่เว็บทางการของหน่วยงาน
