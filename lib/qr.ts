// A real, scannable QR code — generated once with the `qrcode` CLI, not drawn to look like one:
//   npx qrcode -t svg -e M -o qr.svg "https://www.kohkred-sao.go.th/"
// 29x29 modules (version 3, error-correction level M) inside the standard 4-module quiet zone, so
// module coordinates run 4..32 and the drawing is 37 units square. Point it somewhere else by
// regenerating with the same command — and re-check QR_MODULES, because a shorter or longer URL
// changes the version and therefore the box.
//
// tests/qr.test.mjs re-derives the grid from QR_PATH and checks the finder patterns, both timing
// patterns and the dark module, which is what separates a real code from a convincing decoration.
//
// It resolves to the official Koh Kret Subdistrict Administrative Organisation website, verified
// live (HTTP 200). It deliberately does NOT claim to open a 360° tour: no such tour exists for this
// project yet, and shipping a QR that promises one would be a lie printed on the wall.

export const QR_TARGET_URL = "https://www.kohkred-sao.go.th/";
export const QR_TARGET_LABEL = "kohkred-sao.go.th";
export const QR_MODULES = 37; // 29 data modules + a 4-module quiet zone on each side

export const QR_PATH =
  "M4 4.5h7m3 0h4m2 0h4m2 0h7M4 5.5h1m5 0h1m1 0h2m2 0h1m1 0h3m1 0h3m1 0h1m5 0h1M4 6.5h1m1 0h3m1 0h1m4 0h4m1 0h1m3 0h1m1 0h1m1 0h3m1 0h1M4 7.5h1m1 0h3m1 0h1m2 0h2m2 0h3m3 0h1m2 0h1m1 0h3m1 0h1M4 8.5h1m1 0h3m1 0h1m1 0h2m2 0h1m1 0h1m2 0h3m2 0h1m1 0h3m1 0h1M4 9.5h1m5 0h1m3 0h1m1 0h2m4 0h3m1 0h1m5 0h1M4 10.5h7m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h7M14 11.5h1m1 0h3m1 0h2M4 12.5h1m1 0h1m1 0h1m1 0h1m2 0h3m2 0h2m1 0h1m6 0h1m2 0h1M4 13.5h2m2 0h1m4 0h1m1 0h1m2 0h2m1 0h1m2 0h3m2 0h1m2 0h1M5 14.5h1m1 0h4m1 0h6m3 0h1m8 0h3M4 15.5h1m1 0h4m2 0h1m2 0h2m2 0h1m1 0h4m1 0h1m1 0h1m2 0h1M4 16.5h2m1 0h5m1 0h2m1 0h1m3 0h2m1 0h4m2 0h1m1 0h2M6 17.5h4m1 0h2m2 0h3m1 0h2m4 0h3m1 0h1m2 0h1M5 18.5h10m3 0h4m2 0h2m1 0h1m1 0h1m1 0h2M4 19.5h2m2 0h2m7 0h2m1 0h5m1 0h1m2 0h1m1 0h1M6 20.5h1m3 0h1m5 0h1m1 0h2m1 0h2m1 0h4m1 0h1m1 0h2M6 21.5h1m1 0h2m2 0h2m1 0h2m1 0h2m4 0h3m2 0h2m1 0h1M4 22.5h1m4 0h2m2 0h3m1 0h1m3 0h1m5 0h1m3 0h2M5 23.5h1m1 0h3m3 0h1m5 0h1m1 0h1m1 0h3m3 0h1m1 0h1M4 24.5h1m1 0h2m1 0h4m1 0h1m5 0h2m2 0h5M12 25.5h3m2 0h1m1 0h6m3 0h1m1 0h3M4 26.5h7m2 0h1m4 0h3m2 0h2m1 0h1m1 0h2m1 0h2M4 27.5h1m5 0h1m2 0h1m2 0h3m1 0h2m2 0h1m3 0h2m1 0h2M4 28.5h1m1 0h3m1 0h1m1 0h2m2 0h1m1 0h4m2 0h5m2 0h1M4 29.5h1m1 0h3m1 0h1m3 0h1m3 0h2m3 0h2m3 0h1m1 0h1M4 30.5h1m1 0h3m1 0h1m1 0h1m1 0h2m6 0h1m1 0h1m2 0h3m2 0h1M4 31.5h1m5 0h1m3 0h1m5 0h2m2 0h3m1 0h1m2 0h1M4 32.5h7m1 0h1m1 0h1m1 0h10m1 0h3m1 0h2";
