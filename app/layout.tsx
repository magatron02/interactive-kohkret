import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

// One family carries Thai and Latin without a font-switch seam. 400 is the floor: thinner weights
// bloom against navy in bright light.
const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Koh Kret Smart Tourism Map — แผนที่เที่ยวเกาะเกร็ด",
  description:
    "แผนที่เที่ยวเกาะเกร็ด นนทบุรี วางแผนเส้นทาง ค้นหาวัด คาเฟ่ ร้านอาหาร และท่าเรือ จากข้อมูลจริง OpenStreetMap",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th">
      <body className={notoSansThai.className}>
        {/* Decorative only — the incised kiln lids Koh Kret is known for, faded behind the page. */}
        <div className="page-backdrop" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
