# Product

## Register

product

## Users

นักท่องเที่ยว (ไทย+ต่างชาติ) วางแผนเที่ยวเกาะเกร็ดแบบไปเช้าเย็นกลับ ส่วนใหญ่ใช้มือถือ — วางแผนล่วงหน้า (ในร่ม) และเดินเที่ยวจริงกลางแจ้งบนเกาะ งานหลัก: กรอง/ค้นหาสถานที่ตามหมวด → เลือกเส้นทางแนะนำ → ดู itinerary

## Product Purpose

Interactive route-planning map เกาะเกร็ด ช่วยตัดสินใจเที่ยวเร็วโดยไม่ต้องอ่านเยอะ. Success = วางแผนทริปเสร็จใน 1-2 นาที ไม่หลงทาง

ข้อมูลทุกจุดเป็นของจริงที่ตรวจสอบได้ — พิกัดจาก OpenStreetMap, คำอธิบายจากแหล่งอ้างอิงที่ระบุได้. จำนวนสถานที่ต่อหมวดที่แสดงบนหน้าจอคือจำนวนจริงในชุดข้อมูล ไม่ใช่ตัวเลขประกอบภาพ

## Brand Personality

heritage, clear, contemporary — เคารพความเป็นชุมชนมอญ/เกาะเกร็ดดั้งเดิม นำเสนอด้วยความชัดเจนแบบ product สมัยใหม่ ไม่การ์ตูนเกินจำเป็น

## Anti-references

- AI-slop: gradient text, glassmorphism พร่ำเพรื่อ, card grid เหมือนกันหมด, uppercase eyebrow ทุก section, ตัวเลข 01/02/03 กำกับทุกหัวข้อ
- **Generic "neon on black" dark UI** — dev-tool dashboard / crypto terminal / sci-fi HUD. นี่คือ failure mode อันดับหนึ่งของ dark theme และเป็นเส้นที่ห้ามข้าม ธีมมืดของโปรเจคนี้ต้องอ่านออกว่าเป็น "แผนที่เดินเรือ/แผนที่ภูมิศาสตร์ยามค่ำ" ไม่ใช่หน้าจอเทรด
- ความรกของ mockup อ้างอิง (card/badge เต็มจอทุก section) — โจทย์เดิมคือ "ไม่รกเกินไป" ยังใช้อยู่
- ตัวเลข/สถานที่/เวลาเปิด-ปิดที่แต่งขึ้นเพื่อให้หน้าจอดูเต็ม

## Design Principles

1. **Legible outdoors** — contrast ต้องผ่านกลางแดดจริง body text ตั้งเป้า ≥7:1 (เข้มกว่า WCAG AA) และห้ามมีข้อความไหนต่ำกว่า 4.5:1
2. **Heritage without pastiche** — สื่อเกาะเกร็ด/มอญผ่าน motif เรียบ (เจดีย์ เครื่องปั้น เรือ) ไม่ใช่ clipart
3. **Function first** — ทุก element ต้องช่วย filter/route/itinerary ตัดของตกแต่งล้วนๆ ออก
4. **Real data only** — ไม่มีสถานที่ปลอม ไม่มีเวลาเปิดที่เดาเอง ไม่มี QR หลอกตา ถ้าไม่รู้ให้เว้นว่างและออกแบบ empty state ให้ดี
5. **Motion with purpose** — animation สื่อสถานะ (route ถูกเลือก, filter เปลี่ยน) ไม่ใช่เอฟเฟกต์ประดับ

## Theme Decision (superseded once)

**ปัจจุบัน: dark navy.** ผู้ใช้เลือกจาก reference image "KOH KRET SMART TOURISM MAP"

ก่อนหน้านี้โปรเจคเลือก light theme โดยให้เหตุผลว่าอ่านกลางแดดง่ายกว่า และเคยระบุ dark navy เป็น anti-reference. ผู้ใช้กลับคำตัดสินนั้นเองหลังเห็น reference ครั้งที่สอง — เอกสารนี้จึงถูกแก้ให้ตรงกับโค้ด

Trade-off ที่ยังอยู่จริงและไม่ได้หายไป: จอมืดกลางแดดจัดยังสู้จอสว่างไม่ได้ในเชิงกายภาพ (จอต้องดันความสว่างสวนแสงแวดล้อม). ธีมมืดนี้ชดเชยด้วย — พื้นเป็น deep navy ไม่ใช่ดำสนิท (ลดการสะท้อนเป็นกระจกและ smear บน OLED), body text ดัน contrast ขึ้นไป ≥7:1 แทนที่จะพอใจแค่ 4.5:1, touch target ใหญ่ขึ้น. ถ้าภาคสนามพบว่ายังอ่านยาก ทางแก้คือเพิ่ม light/dark toggle ไม่ใช่ถอย

## Roadmap (ยังไม่ทำใน v1)

- 360° virtual tour ของจริง — ตอนนี้ QR ชี้ไปเว็บทางการ อบต. (ของจริง ตรวจสอบแล้ว) เพราะยังไม่มีทัวร์จริงให้ชี้
- AI Virtual Guide chat — ตัดออกตามที่ผู้ใช้ตัดสินใจ (ต้องมี backend + ค่า API ต่อเนื่อง)
- แผนที่จริงแบบเลื่อน/ซูมได้ (Leaflet) — data มี lat/lng จริงรออยู่แล้ว เพิ่ม map provider ได้โดยไม่ต้องรื้อ
- สถานที่เพิ่มเติมที่รู้ว่ามีจริงแต่ยังไม่มีพิกัดยืนยัน (เตี๋ยวอิงน้ำ, รังนก คาเฟ่, กาแฟบ้านเลขที่ ๑, ร.ศ.๑๒๗) — รอ geocode ก่อนใส่

## Accessibility & Inclusion

WCAG AA เป็นขั้นต่ำ, body text ตั้งเป้า 7:1, prefers-reduced-motion ทุก animation, ชื่อสถานที่ไทย/อังกฤษ, touch target ≥44px, keyboard navigation + focus ring ที่มองเห็นได้ทุก control
