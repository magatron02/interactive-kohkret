import type { Metadata } from "next";
import { K2D, Baloo_2 } from "next/font/google";
import "./globals.css";

// Thai body copy: K2D. 400 is the floor — thinner weights bloom against navy in bright light.
const k2d = K2D({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-th",
});
// English wordmarks and section labels ("KOH KRET", "CATEGORIES", "HIGHLIGHT ROUTES"). Not Poppins,
// Montserrat, Inter or Kanit — the geometric-grotesk default every AI-generated page reaches for, which
// reads generic precisely because it is everywhere. K2D's letterforms are soft and rounded at the
// terminals; Baloo 2 shares that same rounded-geometric construction rather than pairing a rounded Thai
// face against a hard-cornered Latin one, so the two read as one typographic family, not two fonts that
// happen to share a page.
const balooTwo = Baloo_2({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-en",
});

export const metadata: Metadata = {
  title: "Koh Kret Smart Tourism Map — แผนที่เที่ยวเกาะเกร็ด",
  description:
    "แผนที่เที่ยวเกาะเกร็ด นนทบุรี วางแผนเส้นทาง ค้นหาวัด คาเฟ่ ร้านอาหาร และท่าเรือ จากข้อมูลจริง OpenStreetMap",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th">
      <body className={`${k2d.variable} ${balooTwo.variable} font-th`}>
        {/* Decorative only — the incised kiln lids Koh Kret is known for, faded behind the page. */}
        <div className="page-backdrop" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
