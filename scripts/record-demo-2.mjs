// Records the second demo: patient and clinic features. With --dry it only checks each step and saves screenshots.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';

const root = path.resolve(import.meta.dirname, '..');
const DRY = process.argv.includes('--dry');
const OUT = path.join(root, 'demo-video');
const SHOTS = path.join(OUT, 'shots2');
const AUDIO = path.join(OUT, 'audio2');
const BASE = 'http://localhost:3000';
const API = `${BASE}/api/v1`;
const VIEW = { width: 1440, height: 810 };
const CROP_H = VIEW.height - 10;
const URDU_WAV = path.join(root, 'demo-data/audio/urdu-instructions.wav');
const FINAL = path.join(OUT, 'ClinicMind-Demo-2-Patient-Features.mp4');
fs.mkdirSync(SHOTS, { recursive: true });
const narration = JSON.parse(fs.readFileSync(path.join(root, 'scripts/narration-2.json'), 'utf8'));

function wavSeconds(file) {
  const b = fs.readFileSync(file);
  return (b.length - 44) / (b.readUInt32LE(24) * (b.readUInt16LE(34) / 8) * b.readUInt16LE(22));
}

const OVERLAY = () => {
  const add = () => {
    if (document.getElementById('demo-caption')) return;
    const style = document.createElement('style');
    style.textContent = `#demo-caption{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);width:min(1000px,70vw);padding:12px 20px;border-radius:12px;background:#071a1fe8;color:#fff;font:600 20px/1.35 Inter,Arial,sans-serif;text-align:center;z-index:99990;opacity:0;transition:opacity .25s;pointer-events:none}
#demo-caption.side{left:auto;right:26px;bottom:auto;top:50%;transform:translateY(-50%);width:440px;font-size:24px;text-align:left;padding:20px 24px}
#demo-cursor{position:fixed;left:0;top:0;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:#ffb300cc;border:2px solid #fff;box-shadow:0 1px 6px #0007;z-index:99999;pointer-events:none;transition:transform .08s}
#demo-card{position:fixed;inset:0;display:none;place-content:center;gap:16px;background:linear-gradient(135deg,#0a3a40,#0d7a78);color:#fff;text-align:center;z-index:99980;font-family:Inter,Arial,sans-serif;padding:60px}
#demo-sync{position:fixed;left:0;bottom:0;width:10px;height:10px;background:#fff;z-index:100000;pointer-events:none}
#demo-card h1{font-size:60px;margin:0}#demo-card p{font-size:27px;margin:0 auto;max-width:980px;line-height:1.4}#demo-card small{display:block;margin-top:18px;font-size:18px;opacity:.85}
#demo-chips{display:flex;flex-wrap:wrap;justify-content:center;gap:9px;max-width:980px;margin:6px auto 0}#demo-chips span{padding:6px 14px;border-radius:18px;background:#ffffff24;font-size:17px}`;
    document.documentElement.appendChild(style);
    for (const id of ['demo-caption', 'demo-cursor', 'demo-card', 'demo-sync']) {
      const d = document.createElement('div');
      d.id = id;
      document.documentElement.appendChild(d);
    }
    addEventListener('mousemove', (e) => { const c = document.getElementById('demo-cursor'); c.style.left = `${e.clientX}px`; c.style.top = `${e.clientY}px`; }, true);
    addEventListener('mousedown', () => { document.getElementById('demo-cursor').style.transform = 'scale(.65)'; }, true);
    addEventListener('mouseup', () => { document.getElementById('demo-cursor').style.transform = ''; }, true);
  };
  if (document.documentElement) add();
  document.addEventListener('DOMContentLoaded', add);
};

const browser = await chromium.launch({ headless: true });
await fetch(`${API}/demo/reset`, { method: 'POST' });
const hero = (await (await fetch(`${API}/patients`)).json()).find((p) => p.mrn === 'CM-1042');
const context = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1, ...(DRY ? {} : { recordVideo: { dir: path.join(OUT, 'raw2'), size: VIEW } }) });
await context.addInitScript(OVERLAY);
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`page: ${e.message}`));
page.on('response', (r) => { if (r.status() >= 400 && !r.url().includes('favicon')) errors.push(`${r.status()} ${r.url()}`); });
const t0 = Date.now();
const track = [];
const wait = (ms) => (DRY ? Promise.resolve() : page.waitForTimeout(ms));
const shot = (name) => (DRY ? page.screenshot({ path: path.join(SHOTS, `${name}.png`) }) : Promise.resolve());
const el = (id) => page.getByTestId(id).first();
const level = (i) => 30 + i * 11;

async function mark(file) {
  await page.evaluate((v) => { document.getElementById('demo-sync').style.background = `rgb(${v},${v},${v})`; }, level(track.length));
  track.push({ file, at: (Date.now() - t0) / 1000 });
}
async function caption(text, cls = '') {
  await page.evaluate(([t, c]) => { const e = document.getElementById('demo-caption'); e.className = c; if (t) e.textContent = t; e.style.opacity = t ? 1 : 0; }, [text, cls]);
}
async function say(name, action, cls = '') {
  const file = path.join(AUDIO, `${name}.wav`);
  await caption(narration[name], cls);
  await mark(file);
  const started = Date.now();
  if (action) await action();
  const left = wavSeconds(file) * 1000 + 350 - (Date.now() - started);
  if (left > 0) await wait(left);
  await caption('', cls);
}
async function pointAt(locator) {
  await locator.waitFor({ state: 'visible', timeout: 90000 });
  await locator.evaluate((e) => e.scrollIntoView({ block: 'center' }));
  await wait(150);
  const b = await locator.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: DRY ? 1 : 20 });
  await wait(220);
}
async function click(locator) { await pointAt(locator); await locator.click(); await wait(220); }
const clickId = (id) => click(el(id));
const navTo = (name) => click(page.getByRole('link', { name, exact: false }).first());
async function card(html) { await page.evaluate((h) => { const c = document.getElementById('demo-card'); c.innerHTML = h; c.style.display = h ? 'grid' : 'none'; }, html); }

async function decodeQr(locator, expected) {
  if (!DRY) return;
  const png = PNG.sync.read(await locator.screenshot());
  const result = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  if (!result || !result.data.includes(expected)) throw new Error(`QR code did not decode correctly: ${result?.data}`);
  console.log('QR ok:', result.data);
}

const connected = await (await fetch(`${API}/patients/${hero.id}/connected`)).json();
const PORTAL = `${BASE}/my/${connected.portal_token}`;
async function openPortal() {
  await page.goto(PORTAL);
  await el('birth-year').waitFor();
  await el('birth-year').click();
  await page.keyboard.type('1968', { delay: DRY ? 0 : 70 });
  await clickId('unlock');
  await el('tab-home').waitFor();
}

// Intro
await page.goto(BASE);
await page.mouse.move(700, 120);
await card('<h1>ClinicMind</h1><p>New: care between visits</p><div id="demo-chips"><span>Auto Alerts</span><span>WhatsApp and SMS</span><span>Patient QR code</span><span>My Health page</span><span>Urdu read-aloud</span><span>Medicine ticks</span><span>Home readings</span><span>QR check-in</span><span>Waiting room screen</span><span>Emergency card</span><span>48-hour sharing</span><span>Clinic Pulse</span></div><small>Demo with made-up patients. Not for real patient care.</small>');
await say('intro');
await card('');

// Auto alerts
await navTo('Auto Alerts');
await el('run-alerts').waitFor();
await say('alerts', async () => { await wait(2400); await clickId('run-alerts'); await el('alerts-created').waitFor(); await page.evaluate(() => scrollTo(0, 0)); });
await shot('01-alerts');
await say('alerts_result', async () => {
  await click(el('message-appointment_reminder'));
  await wait(2200);
  await click(page.getByTestId('message-appointment_reminder').filter({ hasText: 'SMS' }).first());
  await wait(1800);
  await pointAt(page.getByTestId('message-appointment_reminder').filter({ hasText: 'Not sent' }).first());
});
await shot('02-alerts-messages');
await say('approve', async () => { await click(el('message-missed_doses')); await wait(1200); await clickId('approve-missed_doses'); await page.getByTestId('approve-missed_doses').waitFor({ state: 'detached' }); });
await shot('03-approved');

// Patient QR
await page.evaluate(() => scrollTo(0, 0));
await page.goto(`${BASE}/patients/${hero.id}`);
await el('show-qr').waitFor();
await shot('04-patient-connected');
await click(el('show-qr'));
await el('qr-code').waitFor();
await decodeQr(el('qr-code'), `/my/${connected.portal_token}`);
await say('qr', async () => { await wait(1500); await pointAt(el('qr-code')); });
await shot('05-qr');
await clickId('open-portal');
await el('birth-year').waitFor();
await el('birth-year').click();
await page.keyboard.type('1968', { delay: DRY ? 0 : 90 });
await wait(350);
await shot('06-unlock');
await clickId('unlock');
await el('tab-home').waitFor();
await shot('07-portal-home');

// Simple words and Urdu
await say('portal', async () => { await wait(1500); await clickId('lang-toggle'); await wait(600); }, 'side');
await shot('08-portal-urdu');
await say('listen', () => pointAt(el('listen')), 'side');
await shot('09-listen');
await caption('سنیں: میٹفارمن، ایملوڈیپین اور ایٹورواسٹیٹن کی ہدایات', 'side');
await mark(URDU_WAV);
await wait(wavSeconds(URDU_WAV) * 1000 + 300);
await caption('', 'side');
await clickId('lang-toggle');

// Reports
await clickId('tab-reports');
await el('pt-lab-hb').waitFor();
await say('reports', async () => {
  await pointAt(el('pt-lab-hb'));
  await wait(3000);
  await clickId('orig-hb');
  await el('pt-report').waitFor();
  await page.waitForLoadState('networkidle');
  await wait(2500);
  await shot('10-report');
  await el('pt-report').click();
}, 'side');

// Medicine
await clickId('tab-medicine');
await el('pt-medicine').waitFor();
await say('medicine', async () => {
  await wait(800);
  await clickId('dose-metformin-morning');
  await page.getByTestId('dose-metformin-morning').and(page.locator('.on')).waitFor();
  await wait(500);
  await clickId('dose-amlodipine-morning');
  await page.getByTestId('dose-amlodipine-morning').and(page.locator('.on')).waitFor();
  await shot('11-medicine');
}, 'side');

// Home reading
await clickId('tab-readings');
await el('pt-readings').waitFor();
await say('reading', async () => {
  await el('reading-1').click();
  await page.keyboard.type('188', { delay: DRY ? 0 : 110 });
  await el('reading-2').click();
  await page.keyboard.type('112', { delay: DRY ? 0 : 110 });
  await wait(300);
  await clickId('reading-save');
  await el('reading-flag').waitFor();
  await shot('12-reading-flag');
}, 'side');

// Doctor alert
await page.goto(`${BASE}/alerts`);
await el('reading-alert').waitFor();
await say('doctor_alert', () => pointAt(el('reading-alert')));
await shot('13-doctor-alert');

// Before the visit and check-in
await openPortal();
await say('previsit', async () => {
  await clickId('sym-Sore throat');
  await wait(450);
  await clickId('sym-Tiredness');
  await el('previsit-question').click();
  await page.keyboard.type('Why am I always tired?', { delay: DRY ? 0 : 40 });
  await wait(300);
  await clickId('previsit-send');
  await el('previsit-sent').waitFor();
  await shot('14-previsit');
}, 'side');
await page.evaluate(() => document.querySelector('.pt-scroll').scrollTo(0, 0));
await say('checkin', async () => {
  await wait(600);
  await clickId('check-in');
  await el('pt-token').waitFor();
  await el('pt-token').evaluate((e) => e.scrollIntoView({ block: 'center' }));
  await shot('15-checkin');
}, 'side');

// Waiting room
await page.goto(`${BASE}/waiting-room`);
await el('waiting-room').waitFor();
await shot('16-waiting-room');
await say('tv', async () => {
  await wait(DRY ? 0 : 6000);
  await fetch(`${API}/queue/next`, { method: 'POST' });
  await page.waitForFunction(() => document.querySelector('[data-testid="tv-now"]').textContent === '2');
  await shot('17-waiting-room-next');
});

// Doctor sees the patient's answers
await page.goto(BASE);
await el('patient-says').waitFor();
await shot('18-today-patient-says');

// Emergency card
await openPortal();
await clickId('tab-card');
await el('pt-card').waitFor();
await decodeQr(page.locator('.qr-box').first(), '/e/');
await clickId('open-emergency');
await el('emergency-card').waitFor();
await say('emergency', () => pointAt(el('em-allergy')), 'side');
await shot('19-emergency');

// Share
await openPortal();
await clickId('tab-card');
await say('share', async () => {
  await clickId('make-share');
  await el('share-link').waitFor();
  await wait(1200);
  await shot('20-share');
}, 'side');
const shareUrl = await el('open-share').getAttribute('href');
await clickId('open-share');
await el('shared-record').waitFor();
await wait(2600);
await shot('21-shared-record');

// Who opened it
await openPortal();
await clickId('tab-card');
await el('pt-access').waitFor();
await say('access', () => pointAt(el('pt-access')), 'side');
await shot('22-access');
await clickId('stop-share').catch(() => {});

// Ended links must not open.
if (DRY) {
  await page.waitForTimeout(500);
  await page.goto(`${BASE}${shareUrl}`);
  await el('share-ended').waitFor();
  console.log('Stopped link refused: ok');
}

// Clinic Pulse
await page.goto(`${BASE}/pulse`);
await el('pulse').waitFor();
await say('pulse', () => wait(800));
await shot('23-pulse');

// Close
await card('<h1>ClinicMind</h1><p>Better care between visits, for patients and for doctors.</p><small>Demo with made-up patients and simulated messages. Not a medical device.</small>');
await say('close');
await wait(1000);

const video = DRY ? null : page.video();
await context.close();
if (errors.filter((e) => !e.includes('/shared/')).length) console.log('Problems seen:\n' + [...new Set(errors)].join('\n'));
if (DRY) {
  await browser.close();
  console.log('Dry run passed.');
  process.exit(0);
}

// The name badge, made once and placed on the finished video.
const badgePage = await browser.newPage({ viewport: { width: 300, height: 44 } });
await badgePage.setContent('<body style="margin:0;background:transparent"><div style="display:inline-block;padding:7px 14px;border-radius:9px;background:#071a1fdd;color:#fff;font:600 15px Inter,Arial,sans-serif">Built by Khurram Shahid</div></body>');
const BADGE = path.join(OUT, 'name-badge.png');
await badgePage.locator('div').screenshot({ path: BADGE, omitBackground: true });
await browser.close();

const raw = await video.path();
const FPS = 10;
const shades = spawnSync(ffmpegPath, ['-loglevel', 'error', '-i', raw, '-vf', `fps=${FPS},crop=4:4:2:${VIEW.height - 7},scale=1:1:flags=area,format=gray`, '-f', 'rawvideo', '-'], { maxBuffer: 1 << 26 }).stdout;
let from = 0;
let clock = 0;
for (const [i, t] of track.entries()) {
  let found = -1;
  for (let f = from; f < shades.length; f += 1) if (Math.abs(shades[f] - level(i)) <= 3) { found = f; break; }
  if (found < 0) throw new Error(`Marker ${i} was not found in the video.`);
  from = found;
  t.video = Math.max(found / FPS, clock);
  clock = t.video + wavSeconds(t.file) + 0.15;
}
fs.writeFileSync(path.join(OUT, 'track2.json'), JSON.stringify(track.map((t) => ({ name: path.basename(t.file, '.wav'), wall: +t.at.toFixed(1), video: +t.video.toFixed(1) })), null, 1));
const inputs = track.flatMap((t) => ['-i', t.file]);
const badgeIndex = track.length + 1;
const delays = track.map((t, i) => `[${i + 1}:a]aresample=48000,adelay=${Math.round(t.video * 1000)}:all=1[a${i}]`).join(';');
const filter = `[0:v]crop=${VIEW.width}:${CROP_H}:0:0[c];[c][${badgeIndex}:v]overlay=14:H-h-14[v];${delays};${track.map((_, i) => `[a${i}]`).join('')}amix=inputs=${track.length}:normalize=0[a]`;
const r = spawnSync(ffmpegPath, ['-y', '-i', raw, ...inputs, '-i', BADGE, '-filter_complex', filter, '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', FINAL], { stdio: ['ignore', 'ignore', 'pipe'] });
if (r.status !== 0) throw new Error(r.stderr.toString().slice(-900));
console.log('Video saved:', FINAL, `${(fs.statSync(FINAL).size / 1048576).toFixed(1)} MB`);

// A copy of the first video with the name added. The original file is left untouched.
const FIRST = path.join(OUT, 'ClinicMind-Demo.mp4');
const COPY = path.join(OUT, 'ClinicMind-Demo-1-With-Name.mp4');
if (fs.existsSync(FIRST)) {
  const c = spawnSync(ffmpegPath, ['-y', '-i', FIRST, '-i', BADGE, '-filter_complex', '[0:v][1:v]overlay=14:H-h-14[v]', '-map', '[v]', '-map', '0:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', COPY], { stdio: ['ignore', 'ignore', 'pipe'] });
  if (c.status !== 0) throw new Error(c.stderr.toString().slice(-600));
  console.log('Video saved:', COPY);
}
