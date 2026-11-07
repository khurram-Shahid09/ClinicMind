// Records the full demo using the original narration at its original speed. --dry only checks each step.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';

const root = path.resolve(import.meta.dirname, '..');
const DRY = process.argv.includes('--dry');
const OUT = path.join(root, 'demo-video');
const SHOTS = path.join(OUT, 'shots-full');
const BASE = 'http://localhost:3000';
const API = `${BASE}/api/v1`;
const VIEW = { width: 1440, height: 810 };
const FINAL = path.join(OUT, 'ClinicMind-Full-Demo.mp4');
fs.mkdirSync(SHOTS, { recursive: true });
const first = JSON.parse(fs.readFileSync(path.join(root, 'scripts/narration.json'), 'utf8'));
const second = JSON.parse(fs.readFileSync(path.join(root, 'scripts/narration-2.json'), 'utf8'));
const line = (set, name) => (set === 1 ? { text: first[name], file: path.join(OUT, 'audio', `${name}.wav`) } : { text: second[name], file: path.join(OUT, 'audio2', `${name}.wav`) });

function wavSeconds(file) {
  const b = fs.readFileSync(file);
  return (b.length - 44) / (b.readUInt32LE(24) * (b.readUInt16LE(34) / 8) * b.readUInt16LE(22));
}

const OVERLAY = () => {
  const add = () => {
    if (document.getElementById('demo-caption')) return;
    const style = document.createElement('style');
    style.textContent = `#demo-caption{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);width:min(1000px,70vw);padding:12px 20px;border-radius:12px;background:#071a1fe8;color:#fff;font:600 20px/1.35 Inter,Arial,sans-serif;text-align:center;z-index:99990;opacity:0;transition:opacity .25s;pointer-events:none}
#demo-caption.top{top:12px;bottom:auto;width:760px;font-size:17px;padding:8px 16px}
#demo-caption.side{left:auto;right:26px;bottom:auto;top:50%;transform:translateY(-50%);width:440px;font-size:24px;text-align:left;padding:20px 24px}
#demo-cursor{position:fixed;left:0;top:0;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:#ffb300cc;border:2px solid #fff;box-shadow:0 1px 6px #0007;z-index:99999;pointer-events:none;transition:transform .08s}
#demo-card{position:fixed;inset:0;display:none;place-content:center;gap:16px;background:linear-gradient(135deg,#0a3a40,#0d7a78);color:#fff;text-align:center;z-index:99980;font-family:Inter,Arial,sans-serif;padding:60px}
#demo-sync{position:fixed;left:0;bottom:0;width:10px;height:10px;background:#fff;z-index:100000;pointer-events:none}
#demo-card h1{font-size:64px;margin:0}#demo-card p{font-size:28px;margin:0 auto;max-width:980px;line-height:1.4}#demo-card small{display:block;margin-top:18px;font-size:18px;opacity:.85}`;
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
const connected = await (await fetch(`${API}/patients/${hero.id}/connected`)).json();
const context = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1, ...(DRY ? {} : { recordVideo: { dir: path.join(OUT, 'raw-full'), size: VIEW } }) });
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
const level = (i) => 30 + i * 8;

async function caption(text, cls = '') {
  await page.evaluate(([t, c]) => { const e = document.getElementById('demo-caption'); e.className = c; if (t) e.textContent = t; e.style.opacity = t ? 1 : 0; }, [text, cls]);
}
async function say(set, name, action, cls = '') {
  const { text, file } = line(set, name);
  await caption(text, cls);
  await page.evaluate((v) => { document.getElementById('demo-sync').style.background = `rgb(${v},${v},${v})`; }, level(track.length));
  track.push({ file, at: (Date.now() - t0) / 1000 });
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

// Introduction
await page.goto(BASE);
await page.mouse.move(700, 400);
await card('<h1>ClinicMind</h1><p>AI helpers that turn a pile of old patient records into a clear story the doctor can check.</p><small>Demo with made-up patients. Not for real patient care.</small>');
await say(1, 'intro');
await card('');

// Main story
await el('today-CM-1042').waitFor();
await say(1, 'today', async () => { await wait(2500); await pointAt(el('open-CM-1042')); });
await clickId('open-CM-1042');
await el('play-story').waitFor();
await say(1, 'patient', async () => { await wait(1500); await pointAt(el('play-story')); });
await clickId('play-story');
await el('replay').waitFor();
if (DRY) { await page.waitForTimeout(1000); await page.getByRole('slider').fill('1'); }
await say(1, 'replay', () => el('trend-card').waitFor({ timeout: 60000 }), 'top');
await say(1, 'trend', async () => { await wait(4000); await pointAt(el('trend-card').getByTestId('source-chip')); }, 'top');
await click(el('trend-card').getByTestId('source-chip'));
await el('source-viewer').waitFor();
await page.waitForLoadState('networkidle');
await say(1, 'source', async () => { await wait(2800); await click(el('source-next')); await wait(1200); await click(el('source-next')); });
await shot('01-source');
await clickId('source-close');
await clickId('replay-close');

// AI helpers
await navTo('Add Records');
await el('use-sample').waitFor();
await say(1, 'board', async () => { await wait(800); await clickId('use-sample'); });
await el('board-done').waitFor({ timeout: 240000 });
await say(1, 'board_done');
await clickId('go-checking');
await el('review-value').waitFor();
await page.waitForLoadState('networkidle');
await say(1, 'review', async () => { await wait(2500); await pointAt(page.getByTestId('option-500 mg')); await wait(3000); await click(page.getByTestId('option-500 mg')); await el('resolved').waitFor(); });

// Urdu question
await page.goto(`${BASE}/patients/${hero.id}`);
await el('ask-input').waitFor();
await say(1, 'ask', async () => {
  await pointAt(el('ask-input'));
  await el('ask-input').click();
  await page.keyboard.type('Pichli visit se kya change hua?', { delay: DRY ? 0 : 55 });
  await wait(400);
  await clickId('ask-send');
  await el('ask-answer').waitFor({ timeout: 90000 });
  await el('ask-answer').evaluate((e) => e.scrollIntoView({ block: 'center' }));
  await shot('02-urdu');
  await wait(4500);
  await click(el('ask-answer').getByTestId('source-chip'));
  await el('source-viewer').waitFor();
});
await clickId('source-close');

// Visit
await page.evaluate(() => scrollTo(0, 0));
await clickId('start-visit');
await el('sample-dictation').waitFor();
await say(1, 'dictate', async () => {
  await wait(1500);
  await clickId('sample-dictation');
  await el('transcript').waitFor({ timeout: 90000 });
});
await say(1, 'alert', async () => {
  await pointAt(el('alert-allergy'));
  await wait(5500);
  await clickId('change-Amoxicillin');
  await el('med-name').fill('Azithromycin');
  await wait(450);
  await el('med-frequency').fill('once a day');
  await wait(350);
  await el('med-duration').fill('three days');
  await wait(350);
  await clickId('med-save');
  await page.getByTestId('alert-allergy').waitFor({ state: 'detached' });
});
await clickId('approve');
await el('approved').waitFor();
await say(1, 'documents', async () => {
  await clickId('make-urdu');
  await el('doc-patient_instructions').waitFor({ timeout: 90000 });
  await el('doc-patient_instructions').evaluate((e) => e.scrollIntoView({ block: 'center' }));
  await wait(2400);
  await clickId('approve-patient_instructions');
  await el('doc-approved-patient_instructions').waitFor();
  await clickId('make-referral');
  await el('doc-referral_letter').waitFor({ timeout: 90000 });
  await el('doc-referral_letter').evaluate((e) => e.scrollIntoView({ block: 'center' }));
  await shot('03-documents');
});

// Auto alerts
await page.evaluate(() => scrollTo(0, 0));
await navTo('Auto Alerts');
await el('run-alerts').waitFor();
await say(2, 'alerts', async () => { await wait(2400); await clickId('run-alerts'); await el('alerts-created').waitFor(); await page.evaluate(() => scrollTo(0, 0)); });
await say(2, 'alerts_result', async () => {
  await click(el('message-appointment_reminder'));
  await wait(2200);
  await click(page.getByTestId('message-appointment_reminder').filter({ hasText: 'SMS' }).first());
  await wait(1800);
  await pointAt(page.getByTestId('message-appointment_reminder').filter({ hasText: 'Not sent' }).first());
  await shot('04-alerts');
});

// Patient page
await page.goto(`${BASE}/patients/${hero.id}`);
await click(el('show-qr'));
await el('qr-code').waitFor();
await say(2, 'qr', async () => { await wait(1500); await pointAt(el('qr-code')); });
await clickId('open-portal');
await el('birth-year').waitFor();
await el('birth-year').click();
await page.keyboard.type('1968', { delay: DRY ? 0 : 90 });
await wait(350);
await clickId('unlock');
await el('tab-home').waitFor();
await say(2, 'portal', async () => { await wait(1500); await clickId('lang-toggle'); await wait(1500); await shot('05-urdu-portal'); }, 'side');
await clickId('lang-toggle');
await clickId('tab-reports');
await el('pt-lab-hb').waitFor();
await say(2, 'reports', async () => {
  await pointAt(el('pt-lab-hb'));
  await wait(3000);
  await clickId('orig-hb');
  await el('pt-report').waitFor();
  await page.waitForLoadState('networkidle');
  await wait(2500);
  await el('pt-report').click();
}, 'side');
await clickId('tab-readings');
await el('pt-readings').waitFor();
await say(2, 'reading', async () => {
  await el('reading-1').click();
  await page.keyboard.type('188', { delay: DRY ? 0 : 110 });
  await el('reading-2').click();
  await page.keyboard.type('112', { delay: DRY ? 0 : 110 });
  await wait(300);
  await clickId('reading-save');
  await el('reading-flag').waitFor();
  await shot('06-reading');
}, 'side');
await page.goto(`${BASE}/alerts`);
await el('reading-alert').waitFor();
await say(2, 'doctor_alert', () => pointAt(el('reading-alert')));

// Check-in and waiting room
await page.goto(`${BASE}/my/${connected.portal_token}`);
await el('birth-year').waitFor();
await el('birth-year').fill('1968');
await clickId('unlock');
await el('tab-home').waitFor();
await say(2, 'checkin', async () => { await wait(600); await clickId('check-in'); await el('pt-token').waitFor(); await el('pt-token').evaluate((e) => e.scrollIntoView({ block: 'center' })); await shot('07-token'); }, 'side');
await page.goto(`${BASE}/waiting-room`);
await el('waiting-room').waitFor();
await say(2, 'tv', async () => {
  await wait(DRY ? 0 : 6000);
  await fetch(`${API}/queue/next`, { method: 'POST' });
  await page.waitForFunction(() => document.querySelector('[data-testid="tv-now"]').textContent === '2');
  await shot('08-waiting-room');
});

// Emergency card and clinic overview
await page.goto(`${BASE}/e/${connected.emergency_token}`);
await el('emergency-card').waitFor();
await say(2, 'emergency', () => pointAt(el('em-allergy')), 'side');
await page.goto(`${BASE}/pulse`);
await el('pulse').waitFor();
await say(2, 'pulse', () => wait(800));
await shot('09-pulse');

// Close
await card('<h1>ClinicMind</h1><p>The patient\'s full story, with proof, before the doctor decides.</p><small>Demo with made-up patients and simulated messages. Not a medical device.</small>');
await say(1, 'close');
await wait(1200);

const video = DRY ? null : page.video();
await context.close();
if (errors.length) console.log('Problems seen:\n' + [...new Set(errors)].join('\n'));
if (DRY) {
  await browser.close();
  console.log('Dry run passed.');
  process.exit(0);
}
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
fs.writeFileSync(path.join(OUT, 'track-full.json'), JSON.stringify(track.map((t) => ({ name: path.basename(t.file, '.wav'), wall: +t.at.toFixed(1), video: +t.video.toFixed(1), seconds: +wavSeconds(t.file).toFixed(1) })), null, 1));
const inputs = track.flatMap((t) => ['-i', t.file]);
const delays = track.map((t, i) => `[${i + 1}:a]aresample=48000,adelay=${Math.round(t.video * 1000)}:all=1[a${i}]`).join(';');
const filter = `[0:v]crop=${VIEW.width}:${VIEW.height - 10}:0:0[c];[c][${track.length + 1}:v]overlay=14:H-h-14[v];${delays};${track.map((_, i) => `[a${i}]`).join('')}amix=inputs=${track.length}:normalize=0[a]`;
const r = spawnSync(ffmpegPath, ['-y', '-i', raw, ...inputs, '-i', path.join(OUT, 'name-badge.png'), '-filter_complex', filter, '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', FINAL], { stdio: ['ignore', 'ignore', 'pipe'] });
if (r.status !== 0) throw new Error(r.stderr.toString().slice(-900));
console.log('Video saved:', FINAL, `${(fs.statSync(FINAL).size / 1048576).toFixed(1)} MB`);
