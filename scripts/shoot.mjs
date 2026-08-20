/**
 * Screenshot harness. Drives a real headless Chrome over the DevTools protocol so states that need
 * interaction — a route selected, a popup open — can be captured, not just the landing view.
 *
 * Why this exists: the editor's own browser pane returns downscaled images and often refuses to
 * render at all while it is not compositing, so visual work was going unreviewed. This gives an
 * actual full-resolution PNG of any state.
 *
 *   node scripts/shoot.mjs [baseUrl] [outDir]
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.argv[2] ?? 'http://localhost:3100';
const OUT = process.argv[3] ?? 'screenshots';
const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];
const chromePath = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
if (!chromePath) {
  console.error('No Chrome found. Edit CHROME_CANDIDATES in scripts/shoot.mjs.');
  process.exit(1);
}

const PORT = 9222 + Math.floor(Number(process.env.SHOOT_PORT_OFFSET ?? 0));
const userDir = path.join(process.env.TEMP ?? '/tmp', `shoot-profile-${PORT}`);
fs.rmSync(userDir, { recursive: true, force: true });

const chrome = spawn(chromePath, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${userDir}`,
  '--disable-gpu',
  '--hide-scrollbars',
  '--no-first-run',
  '--force-device-scale-factor=1',
  'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function wsUrl() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      return (await r.json()).webSocketDebuggerUrl;
    } catch {
      await sleep(250);
    }
  }
  throw new Error('Chrome did not expose a debugging endpoint');
}

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.waiting = new Map(); this.sessionId = null;
    ws.addEventListener('message', (e) => {
      const m = JSON.parse(e.data);
      if (m.id && this.waiting.has(m.id)) { this.waiting.get(m.id)(m); this.waiting.delete(m.id); }
    });
  }
  send(method, params = {}, sessionId = this.sessionId) {
    const id = ++this.id;
    return new Promise((res, rej) => {
      this.waiting.set(id, (m) => (m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result)));
      this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
}

/** Each shot: a viewport, a URL, and an optional script run in the page before capture. */
const SHOTS = [
  { name: 'desktop-rest', w: 1440, h: 900 },
  { name: 'desktop-category', w: 1440, h: 900, act: `
      [...document.querySelectorAll('[aria-labelledby="categories-heading"] button[aria-pressed]')]
        .filter(b => /Temples|Cafe/.test(b.textContent)).forEach(b => b.click());` },
  { name: 'desktop-route', w: 1440, h: 900, act: `
      [...document.querySelectorAll('[aria-labelledby="routes-heading"] button[aria-pressed]')]
        .find(b => b.textContent.includes('1 วัน')).click();` },
  { name: 'desktop-popup', w: 1440, h: 900, act: `
      [...document.querySelectorAll('[aria-labelledby="routes-heading"] button[aria-pressed]')]
        .find(b => b.textContent.includes('1 วัน')).click();
      await new Promise(r => setTimeout(r, 500));
      document.querySelectorAll('.map-pin')[1].click();` },
  { name: 'desktop-zoom', w: 1440, h: 900, act: `
      const z = document.querySelector('[aria-label="ขยายแผนที่"]');
      z.click(); await new Promise(r=>setTimeout(r,250)); z.click();` },
  { name: 'mobile-rest', w: 375, h: 812 },
  { name: 'mobile-category', w: 375, h: 812, act: `
      [...document.querySelectorAll('[aria-labelledby="categories-heading"] button[aria-pressed]')]
        .find(b => /Temples/.test(b.textContent)).click();` },
  { name: 'mobile-route', w: 375, h: 812, act: `
      [...document.querySelectorAll('[aria-labelledby="routes-heading"] button[aria-pressed]')]
        .find(b => b.textContent.includes('1 วัน')).click();` },
];

const ws = new WebSocket(await wsUrl());
await new Promise((r) => ws.addEventListener('open', r));
const cdp = new CDP(ws);
const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
cdp.sessionId = sessionId;
await cdp.send('Page.enable');
await cdp.send('Runtime.enable');

fs.mkdirSync(OUT, { recursive: true });
for (const shot of SHOTS) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: shot.w, height: shot.h, deviceScaleFactor: 1, mobile: shot.w < 768,
  });
  await cdp.send('Page.navigate', { url: BASE });
  await sleep(1400);
  if (shot.act) {
    await cdp.send('Runtime.evaluate', {
      expression: `(async () => { ${shot.act} })()`, awaitPromise: true,
    });
    await sleep(700);
  }
  // Animations do not advance in a headless render; finish them so the shot shows the resting state.
  await cdp.send('Runtime.evaluate', {
    expression: `document.getAnimations().forEach(a => { try { a.finish(); } catch {} })`,
  });
  await sleep(180);
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  const file = path.join(OUT, `${shot.name}.png`);
  fs.writeFileSync(file, Buffer.from(data, 'base64'));
  console.log(`${shot.name.padEnd(18)} ${shot.w}x${shot.h}  ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
}

ws.close();
chrome.kill();
console.log(`\nwrote ${SHOTS.length} screenshots to ${OUT}/`);
