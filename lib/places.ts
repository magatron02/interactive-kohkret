// Every place below is a REAL, geocoded location on Koh Kret.
//
// Coordinates come from OpenStreetMap via the Overpass API (nwr[amenity|tourism|shop|craft|historic]
// inside the island bbox), filtered to points that fall inside the real coastline polygon — with a 60 m
// shoreline buffer so the ferry piers, which sit just off the bank, survive. Three places absent from
// OSM carry coordinates recovered from their own published map pins, each checked against the polygon.
//
// A place stores ONLY its real lat/lng. Screen position comes from project() in lib/geo.ts, the same
// projection the coastline, water and streets use, so a pin cannot drift out of step with the map
// under it — and re-framing the map never means hand-editing nineteen pairs of numbers again.
//
// Descriptions are drawn from Thai Wikipedia, อบต.เกาะเกร็ด, dooasia and touronthai. Where no sourced
// description exists, `description` is omitted rather than invented — the UI renders that state honestly.
// `hours` is only present when OSM or a source publishes it; temples are left blank because none do.
//
// Counts are therefore REAL counts of verified places (6 temples, 3 cafes, 3 restaurants, 1 homestay,
// 1 craft workshop, 2 piers), not the illustrative numbers printed on the reference poster.
//
// Data © OpenStreetMap contributors, ODbL 1.0.

export type Category = "temple" | "cafe" | "restaurant" | "homestay" | "craft" | "pier";

export type CategoryMeta = {
  id: Category;
  /** Thai label — the primary label for Thai visitors. */
  label: string;
  /** English label, shown small above the Thai one (matches the reference poster). */
  labelEn: string;
  /** CSS custom property holding this category's colour. */
  color: string;
  /** CSS custom property holding the text colour that is legible ON that colour. */
  ink: string;
};

export const CATEGORIES: CategoryMeta[] = [
  { id: "temple", label: "วัด", labelEn: "Temples", color: "var(--color-cat-temple)", ink: "var(--color-cat-temple-ink)" },
  { id: "cafe", label: "ร้านกาแฟ", labelEn: "Cafe", color: "var(--color-cat-cafe)", ink: "var(--color-cat-cafe-ink)" },
  { id: "restaurant", label: "ร้านอาหาร", labelEn: "Restaurant", color: "var(--color-cat-restaurant)", ink: "var(--color-cat-restaurant-ink)" },
  { id: "homestay", label: "โฮมสเตย์", labelEn: "Homestay", color: "var(--color-cat-homestay)", ink: "var(--color-cat-homestay-ink)" },
  { id: "craft", label: "กิจกรรมและผลิตภัณฑ์", labelEn: "Activities & Products", color: "var(--color-cat-craft)", ink: "var(--color-cat-craft-ink)" },
  { id: "pier", label: "จุดขึ้น-ลงเรือ", labelEn: "Boat Boarding Point", color: "var(--color-cat-pier)", ink: "var(--color-cat-pier-ink)" },
];

export type Place = {
  id: string;
  name: string;
  nameEn?: string;
  category: Category;
  /** Real WGS84 coordinates from OpenStreetMap. */
  lat: number;
  lng: number;
  /** Omitted when no sourced description exists. Never invented. */
  description?: string;
  /** Omitted when the place does not publish hours. */
  hours?: string;
  /** Thai labels derived from the OSM `cuisine` tag. */
  cuisine?: string[];
  /** Verbatim from the OSM `phone` tag — not reformatted, so it cannot be corrupted in transit. */
  phone?: string;
  website?: string;
  /** Only set when OSM states it either way; undefined means "not recorded", not "no". */
  wifi?: boolean;
  outdoorSeating?: boolean;
  /**
   * Set when the entry rests on weaker evidence than the rest of the dataset, and shown to the reader.
   * Deleting a place because a guidebook missed it would be its own kind of dishonesty; hiding how
   * thin the evidence is would be worse.
   */
  dataNote?: string;
};

export const PLACES: Place[] = [
  {
    id: "wat-pai-lom",
    name: "วัดไผ่ล้อม",
    nameEn: "Wat Phai Lom",
    category: "temple",
    lat: 13.91268,
    lng: 100.48581,
    description:
      "วัดสมัยอยุธยาตอนปลาย ริมแม่น้ำด้านเหนือของเกาะ ร้างไปเมื่อ พ.ศ. 2308 ครั้งพม่าตีเมืองนนทบุรี อุโบสถงดงามด้วยหน้าบันจำหลักไม้ลายดอกไม้ คันทวยและบัวหัวเสา",
  },
  {
    id: "wat-poramaiyikawat",
    name: "วัดปรมัยยิกาวาส",
    nameEn: "Wat Poramaiyikawat",
    category: "temple",
    lat: 13.91271,
    lng: 100.48999,
    description:
      "พระอารามหลวง สัญลักษณ์ของเกาะคือเจดีย์มุเตา เจดีย์ทรงมอญที่เอียงเพราะกระแสน้ำกัดเซาะฐาน รัชกาลที่ 5 โปรดให้บูรณะทั้งวัดโดยรักษาแบบมอญไว้",
  },
  {
    id: "wat-sao-thong-thong",
    name: "วัดเสาธงทอง",
    nameEn: "Wat Sao Thong Thong",
    category: "temple",
    lat: 13.91374,
    lng: 100.48297,
    description:
      "วัดโบราณสมัยอยุธยา เดิมชื่อวัดสวนหมาก มีเจดีย์ทรงลูกฟักหนึ่งเดียวในไทย เจดีย์สูงที่สุดในอำเภอ และต้นโพธิ์อายุกว่า 200 ปี",
  },
  {
    id: "wat-chan",
    name: "วัดจันทร์",
    nameEn: "Wat Chan",
    category: "temple",
    lat: 13.91297,
    lng: 100.47367,
    // Every other temple here carries a Wikidata id and a secondary source. This one has neither: it is a
    // lone OSM building (way/1184261576) with a name and nothing else, and the Thai Wikipedia article on
    // เกาะเกร็ด does not list it. The วัดจันทร์ that Wikipedia does document is in บางกรวย, a different
    // district. Kept because OSM is a real source, flagged because it is the only one.
    dataNote: "ปรากฏใน OpenStreetMap เท่านั้น ยังไม่พบแหล่งอ้างอิงอื่นยืนยัน",
  },
  {
    id: "wat-sala-kun",
    name: "วัดศาลากุล",
    nameEn: "Wat Sala Kun",
    category: "temple",
    lat: 13.90642,
    lng: 100.48316,
    description:
      "ตั้งอยู่เกือบกลางเกาะ สร้างสมัยธนบุรีโดยเจ้าพระยารัตนาธิเบศน์ (กุน) เป็นวัดไทยวัดเดียวในตำบลเกาะเกร็ด มีชื่อเรื่องหนุมานหลวงปู่สุ่น",
  },
  {
    id: "wat-chimphli-sutthawat",
    name: "วัดฉิมพลีสุทธาวาส",
    nameEn: "Wat Chimphli Sutthawat",
    category: "temple",
    lat: 13.90627,
    lng: 100.48983,
    description:
      "วัดราษฎร์บ้านลัดเกร็ด อุโบสถขนาดเล็กที่ยังสมบูรณ์ตามแบบดั้งเดิม ซุ้มประตูทรงมณฑป ซุ้มหน้าต่างแบบหน้านาง",
  },

  {
    id: "hom-fung-pang-nom",
    name: "หอมฟุ้งปังนม ณ เกาะเกร็ด",
    category: "cafe",
    lat: 13.91338,
    lng: 100.4871,
    hours: "10:00–16:00",
    cuisine: ["ร้านกาแฟ", "ของหวาน", "เค้ก"],
    phone: "0967943836",
    outdoorSeating: false,
  },
  {
    id: "baan-rim-nam-home-cafe",
    name: "บ้านริมน้ำ โฮมคาเฟ่ เกาะเกร็ด",
    category: "cafe",
    lat: 13.91135,
    lng: 100.49097,
    // Verbatim from the OSM `description` tag on node/10902425966.
    description:
      "บ้านริมน้ำบนเกาะเกร็ด นั่งชิลชิลชมวิวเจ้าพระยา กับกาแฟ เครื่องดื่มและของหวานอร่อยๆ ชิคๆ ชิลๆ",
    hours: "จ.–ส. 09:00–18:00",
    cuisine: ["ร้านกาแฟ", "เบอร์เกอร์", "อาหารพื้นถิ่น"],
    phone: "+66830840185",
    website: "https://baanrimnamkohkret.blogspot.com/",
    wifi: true,
    outdoorSeating: true,
  },
  {
    id: "raan-me-rak",
    name: "ร้านมีรักษ์",
    category: "cafe",
    lat: 13.91101,
    lng: 100.49103,
    cuisine: ["ร้านกาแฟ", "อาหารไทย"],
    phone: "0918852408",
    website: "https://www.facebook.com/Ranmeeruk/?locale=th_TH",
    wifi: false,
    outdoorSeating: true,
  },
  {
    // Not in OpenStreetMap. Coordinates recovered from the venue's own published Google Maps pin
    // (the place marker in the resolved link, not the map viewport centre) and confirmed to fall
    // inside the coastline polygon. Hours and phone from a dated review listing.
    id: "rangnok-cafe",
    name: "รังนก คาเฟ่ แอนด์ บาร์",
    nameEn: "Rangnok Cafe & Bar",
    category: "cafe",
    lat: 13.916073,
    lng: 100.4772542,
    description: "คาเฟ่ริมแม่น้ำตกแต่งสไตล์บาหลี มีมุมรังนกสำหรับถ่ายรูป เปิดถึงเที่ยงคืน",
    hours: "ทุกวัน 11:00–24:00",
    phone: "02 036 7865",
  },

  {
    id: "riva-eatery-bar",
    name: "RIVA EATERY & BAR",
    category: "restaurant",
    lat: 13.91162,
    lng: 100.46739,
    description: "อยู่ปลายเกาะฝั่งตะวันตก ห่างจากทางเดินสายหลักที่สุดในบรรดาร้านบนเกาะ",
    dataNote: "ที่อยู่ตรงกับ ร.ศ.๑๒๗ ในข้าวมีคำ (40 หมู่ 4) และหมุดห่างกัน 18 ม. อาจเป็นบริเวณเดียวกัน",
  },
  {
    id: "baan-rim-nam",
    name: "บ้านริมน้ำ",
    category: "restaurant",
    lat: 13.91114,
    lng: 100.49102,
  },
  {
    id: "delicious-thai-food",
    name: "Delicious Thai Food",
    category: "restaurant",
    lat: 13.91049,
    lng: 100.49096,
    cuisine: ["อาหารไทย"],
  },
  {
    // Not in OpenStreetMap. Coordinates from the venue's published Google Maps pin.
    id: "tiao-ing-nam",
    name: "เตี๋ยวอิงน้ำ",
    category: "restaurant",
    lat: 13.9132835,
    lng: 100.4881363,
    description: "ร้านก๋วยเตี๋ยวริมน้ำ ตกแต่งแบบไทยโบราณผสมสมัยใหม่",
    hours: "09:30–17:00 (ปิดวันจันทร์)",
    cuisine: ["ก๋วยเตี๋ยว"],
    phone: "085 333 7819",
  },
  {
    // Not in OpenStreetMap. Coordinates from the restaurant's own website map link.
    id: "rorsor-127",
    name: "ร.ศ.๑๒๗ ในข้าวมีคำ",
    nameEn: "Rorsor 127",
    category: "restaurant",
    lat: 13.9114663,
    lng: 100.4674511,
    description:
      "อาหารไทยในเรือนไม้อายุกว่าร้อยปีริมน้ำ ชื่อร้านมาจากโฉนดที่ดินที่ออกในปี ร.ศ. 127 (พ.ศ. 2451) เข้าถึงโดยเรือจากท่าน้ำวัดใหญ่สว่างอารมณ์",
    cuisine: ["อาหารไทย"],
    phone: "088 895 5566",
    website: "https://rorsor127.com/",
    // Both this restaurant and RIVA EATERY & BAR publish the address "40 หมู่ 4 เกาะเกร็ด", and their
    // map pins are 18 m apart. They are either one venue under two names or two businesses sharing a
    // compound; no source settles it, so both are kept and the overlap is stated rather than guessed away.
    dataNote: "ที่อยู่ตรงกับ RIVA EATERY & BAR (40 หมู่ 4) และหมุดห่างกัน 18 ม. อาจเป็นบริเวณเดียวกัน",
  },

  {
    id: "baanya-homestay",
    name: "Baanya Homestay",
    category: "homestay",
    lat: 13.9027,
    lng: 100.48945,
    description: "ที่พักแห่งเดียวบนเกาะที่ปรากฏใน OpenStreetMap อยู่ทางใต้ของเกาะใกล้ท่าเรือป่าฝ้าย",
  },

  {
    id: "pa-tum-pottery",
    name: "โรงงานเครื่องปั้นดินเผาป้าตุ่ม",
    nameEn: "Pa Tum Pottery Factory",
    category: "craft",
    lat: 13.9131,
    lng: 100.48525,
    description: "แหล่งเรียนรู้เครื่องปั้นดินเผามอญ สืบทอดฝีมือและภูมิปัญญาท้องถิ่นมาถึงรุ่นที่ 5",
    hours: "ทุกวัน 09:00–17:00",
  },

  {
    id: "tha-wat-poramaiyikawat",
    name: "ท่าวัดปรมัยยิกาวาส",
    nameEn: "Wat Poramaiyikawat Ferry Pier",
    category: "pier",
    lat: 13.91269,
    lng: 100.49069,
    description: "ท่าเรือหลักของเกาะ ข้ามฟากจากท่าน้ำวัดสนามเหนือฝั่งปากเกร็ด ค่าโดยสาร 3–5 บาท",
  },
  {
    id: "tha-pa-fai",
    name: "ท่าเรือป่าฝ้าย",
    nameEn: "Pa Fai Pier",
    category: "pier",
    lat: 13.90466,
    lng: 100.49031,
    description: "ท่าเรือข้ามฟากทางใต้ของเกาะ ขึ้นทะเบียนเป็นสถานีขนส่งสาธารณะใน OpenStreetMap",
  },
];

export type RouteStop = { placeId: string; time: string };

export type TourRoute = {
  id: string;
  name: string;
  /** One-line description of who the route is for. */
  tagline: string;
  /** CSS custom property for this route's colour. */
  color: string;
  /** CSS custom property for text placed on that colour. */
  ink: string;
  durationLabel: string;
  stops: RouteStop[];
};

// Stop order is not hand-written. Each route's order was solved against the real street graph to
// minimise the metres of lane walked more than once — the thing that reads as a scribble on the map.
// Some repetition is unavoidable: the island is a spine with dead-end lanes down to each temple, so
// reaching one means walking back out of it.
//
//   full-day  2016 m repeated (35% of the walk)  ->  1112 m (20%)
//   temple     174 m (4%)                        ->    98 m (2%)
//   boat       117 m (8%)                        ->    36 m (2%)
//   pottery     98 m (13%)                       ->    90 m (12%)
//   cafe/food  already 0% — both run along one bank
//
// The day trip is a loop, so its direction is free: it runs temples-first while the morning is cool
// and puts the cafe and the restaurant at the end, beside the pier you leave from. Verified to score
// identically to the reverse.
export const ROUTES: TourRoute[] = [
  {
    id: "full-day",
    name: "เที่ยวเกาะเกร็ด 1 วัน",
    tagline: "ครบทุกไฮไลต์ เริ่มและจบที่ท่าเรือ",
    color: "var(--color-route-1)",
    ink: "var(--color-route-1-ink)",
    durationLabel: "10 จุด · 6–8 ชม.",
    stops: [
      { placeId: "tha-wat-poramaiyikawat", time: "09:00" },
      { placeId: "wat-poramaiyikawat", time: "09:15" },
      { placeId: "wat-pai-lom", time: "10:15" },
      { placeId: "wat-sao-thong-thong", time: "11:00" },
      { placeId: "pa-tum-pottery", time: "11:45" },
      { placeId: "wat-sala-kun", time: "13:00" },
      { placeId: "wat-chimphli-sutthawat", time: "14:15" },
      { placeId: "raan-me-rak", time: "15:15" },
      { placeId: "baan-rim-nam", time: "16:15" },
      { placeId: "tha-wat-poramaiyikawat", time: "17:30" },
    ],
  },
  {
    id: "temple",
    name: "เส้นทางไหว้พระ",
    tagline: "วัดมอญและวัดไทยครบทั้งเกาะ",
    color: "var(--color-route-2)",
    ink: "var(--color-route-2-ink)",
    durationLabel: "6 จุด · 4–5 ชม.",
    stops: [
      { placeId: "wat-chan", time: "09:00" },
      { placeId: "wat-sao-thong-thong", time: "10:00" },
      { placeId: "wat-pai-lom", time: "11:00" },
      { placeId: "wat-poramaiyikawat", time: "12:00" },
      { placeId: "wat-chimphli-sutthawat", time: "13:30" },
      { placeId: "wat-sala-kun", time: "14:30" },
    ],
  },
  {
    id: "cafe",
    name: "เส้นทางคาเฟ่",
    tagline: "จิบกาแฟริมเจ้าพระยา",
    color: "var(--color-route-3)",
    ink: "var(--color-route-3-ink)",
    durationLabel: "4 จุด · 3–4 ชม.",
    stops: [
      { placeId: "rangnok-cafe", time: "11:00" },
      { placeId: "hom-fung-pang-nom", time: "12:30" },
      { placeId: "baan-rim-nam-home-cafe", time: "14:00" },
      { placeId: "raan-me-rak", time: "15:30" },
    ],
  },
  {
    id: "food",
    name: "เส้นทางอาหารริมน้ำ",
    tagline: "ร้านริมแม่น้ำทั้งสองฝั่งเกาะ",
    color: "var(--color-route-4)",
    ink: "var(--color-route-4-ink)",
    durationLabel: "5 จุด · 4–5 ชม.",
    stops: [
      { placeId: "rorsor-127", time: "11:00" },
      { placeId: "riva-eatery-bar", time: "12:00" },
      { placeId: "tiao-ing-nam", time: "13:30" },
      { placeId: "baan-rim-nam", time: "15:00" },
      { placeId: "delicious-thai-food", time: "16:00" },
    ],
  },
  {
    id: "pottery",
    name: "เส้นทางเครื่องปั้นดินเผา",
    tagline: "หัตถกรรมมอญที่เก่าแก่ที่สุดของนนทบุรี",
    color: "var(--color-route-5)",
    ink: "var(--color-route-5-ink)",
    durationLabel: "3 จุด · 3–4 ชม.",
    stops: [
      { placeId: "wat-pai-lom", time: "09:30" },
      { placeId: "pa-tum-pottery", time: "10:30" },
      { placeId: "wat-poramaiyikawat", time: "12:30" },
    ],
  },
  {
    id: "boat",
    name: "เส้นทางล่องเรือ",
    tagline: "ขึ้น-ลงเรือสองท่า ชมเกาะจากแม่น้ำ",
    color: "var(--color-route-6)",
    ink: "var(--color-route-6-ink)",
    durationLabel: "4 จุด · 2–3 ชม.",
    stops: [
      { placeId: "wat-poramaiyikawat", time: "09:00" },
      { placeId: "tha-wat-poramaiyikawat", time: "09:45" },
      { placeId: "tha-pa-fai", time: "10:45" },
      { placeId: "baanya-homestay", time: "11:30" },
    ],
  },
];

export function getPlace(id: string): Place | undefined {
  return PLACES.find((p) => p.id === id);
}

export function getCategory(id: Category): CategoryMeta {
  return CATEGORIES.find((c) => c.id === id)!;
}

/** Real count of verified places per category — drives the numbers shown in the Categories panel. */
export function countByCategory(id: Category): number {
  return PLACES.filter((p) => p.category === id).length;
}
