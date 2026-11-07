// Records the short demo: one main story, with the other features shown briefly. --dry only checks each step.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';

const root = path.resolve(import.meta.dirname, '..');
const DRY = process.argv.includes('--dry');
const OUT = path.join(root, 'demo-video');
const SHOTS = path.join(OUT, 'shots-short');
const AUDIO = path.join(OUT, 'audio-short');
const BASE = 'http://localhost:3000';
const API = `${BASE}/api/v1`;
const VIEW = { width: 1440, height: 810 };
const FINAL = path.join(OUT, 'ClinicMind-Short-Demo.mp4');
const POSTER = path.join(OUT, 'ClinicMind-Short-Demo-Poster.jpg');
fs.mkdirSync(SHOTS, { recursive: true });
const narration = JSON.parse(fs.readFileSync(path.join(root, 'scripts/narration-short.json'), 'utf8'));

function wavSeconds(file) {
  const b = fs.readFileSync(file);
  return (b.length - 44) / (b.readUInt32LE(24) * (b.readUInt16LE(34) / 8) * b.readUInt16LE(22));
}

const OVERLAY = () => {
  window.__demoReplaySeconds = 10;
  const add = () => {
    if (document.getElementById('demo-caption')) return;
    const style = document.createElement('style');
    style.textContent = `#demo-caption{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);width:min(1000px,70vw);padding:12px 20px;border-radius:12px;background:#071a1fe8;color:#fff;font:600 20px/1.35 Inter,Arial,sans-serif;text-align:center;z-index:99990;opacity:0;transition:opacity .2s;pointer-events:none}
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
const context = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1, ...(DRY ? {} : { recordVideo: { dir: path.join(OUT, 'raw-short'), size: VIEW } }) });
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
const level = (i) => 30 + i * 13;

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
  const left = wavSeconds(file) * 1000 + 250 - (Date.now() - started);
  if (left > 0) await wait(left);
  await caption('', cls);
}
async function pointAt(locator) {
  await locator.waitFor({ state: 'visible', timeout: 90000 });
  await locator.evaluate((e) => e.scrollIntoView({ block: 'center' }));
  await wait(100);
  const b = await locator.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: DRY ? 1 : 14 });
  await wait(120);
}
async function click(locator) { await pointAt(locator); await locator.click(); await wait(120); }
const clickId = (id) => click(el(id));
const navTo = (name) => click(page.getByRole('link', { name, exact: false }).first());
async function card(html) { await page.evaluate((h) => { const c = document.getElementById('demo-card'); c.innerHTML = h; c.style.display = h ? 'grid' : 'none'; }, html); }

// Hook
await page.goto(BASE);
await page.mouse.move(700, 120);
await card('<h1>ClinicMind</h1><p>From a pile of old paper to a clear patient story the doctor can check.</p><small>Demo with made-up patients. Not for real patient care.</small>');
await say('hook');
await card('');

// Main story
await el('open-CM-1042').waitFor();
await say('story', async () => {
  await wait(500);
  await clickId('open-CM-1042');
  await el('play-story').waitFor();
  await wait(500);
  await clickId('play-story');
  await el('replay').waitFor();
  await caption(narration.story, 'top');
  if (DRY) { await page.waitForTimeout(1500); await page.getByRole('slider').fill('1'); }
  await el('trend-card').waitFor({ timeout: 60000 });
});
await shot('01-trend');
await say('trend', async () => { await wait(5500); await pointAt(el('trend-card').getByTestId('source-chip')); }, 'top');
await say('proof', async () => {
  await click(el('trend-card').getByTestId('source-chip'));
  await el('source-viewer').waitFor();
  await page.waitForLoadState('networkidle');
  await wait(2200);
  await click(el('source-next'));
  await shot('02-proof');
});
await clickId('source-close');
await clickId('replay-close');

// Quick highlights
await navTo('Add Records');
await say('board', async () => { await clickId('use-sample'); await el('board-done').waitFor({ timeout: 120000 }); await shot('03-board'); });
await clickId('go-checking');
await el('review-value').waitFor();
await page.waitForLoadState('networkidle');
await say('check', async () => { await wait(1800); await pointAt(page.getByTestId('option-500 mg')); await wait(900); await click(page.getByTestId('option-500 mg')); await el('resolved').waitFor(); await shot('04-check'); });

await page.goto(`${BASE}/patients/${hero.id}`);
await el('ask-input').waitFor();
await say('urdu', async () => {
  await pointAt(el('ask-input'));
  await el('ask-input').fill('Pichli visit se kya change hua?');
  await wait(300);
  await clickId('ask-send');
  await el('ask-answer').waitFor({ timeout: 90000 });
  await el('ask-answer').evaluate((e) => e.scrollIntoView({ block: 'center' }));
  await shot('05-urdu');
});

await page.goto(`${BASE}/patients/${hero.id}`);
await clickId('start-visit');
await el('sample-dictation').waitFor();
await say('alert', async () => {
  await clickId('sample-dictation');
  await el('alert-allergy').waitFor({ timeout: 90000 });
  await pointAt(el('alert-allergy'));
  await shot('06-alert');
});

await page.evaluate(() => scrollTo(0, 0));
await navTo('Auto Alerts');
await el('run-alerts').waitFor();
await say('alerts', async () => {
  await clickId('run-alerts');
  await el('alerts-created').waitFor();
  await click(el('message-test_due'));
  await shot('07-alerts');
});

await page.goto(`${BASE}/patients/${hero.id}`);
await el('show-qr').waitFor();
await say('patient', async () => {
  await click(el('show-qr'));
  await el('qr-code').waitFor();
  await wait(1400);
  await clickId('open-portal');
  await el('birth-year').waitFor();
  await caption(narration.patient, 'side');
  await el('birth-year').fill('1968');
  await clickId('unlock');
  await el('tab-home').waitFor();
  await clickId('tab-reports');
  await el('pt-lab-hb').waitFor();
  await wait(1300);
  await clickId('tab-home');
  await clickId('lang-toggle');
  await shot('08-patient');
}, '');
await clickId('lang-toggle');
await page.evaluate(() => document.querySelector('.pt-scroll').scrollTo(0, 0));
await say('checkin', async () => {
  await clickId('check-in');
  await el('pt-token').waitFor();
  await wait(5500);
  await page.goto(`${BASE}/waiting-room`);
  await el('waiting-room').waitFor();
  await caption(narration.checkin);
  await shot('09-waiting-room');
}, 'side');

await page.goto(`${BASE}/e/${connected.emergency_token}`);
await el('emergency-card').waitFor();
await say('emergency', () => pointAt(el('em-allergy')), 'side');
await shot('10-emergency');

// Close
await card('<h1>ClinicMind</h1><p>The patient\'s full story, with proof, before the doctor decides.</p><small>Demo with made-up patients and simulated messages. Not a medical device.</small>');
await say('close');
await wait(900);

const video = DRY ? null : page.video();
await context.close();
if (errors.length) console.log('Problems seen:\n' + [...new Set(errors)].join('\n'));
if (DRY) {
  await browser.close();
  console.log('Dry run passed.');
  process.exit(0);
}

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
  clock = t.video + wavSeconds(t.file) + 0.1;
}
fs.writeFileSync(path.join(OUT, 'track-short.json'), JSON.stringify(track.map((t) => ({ name: path.basename(t.file, '.wav'), wall: +t.at.toFixed(1), video: +t.video.toFixed(1), seconds: +wavSeconds(t.file).toFixed(1) })), null, 1));
const inputs = track.flatMap((t) => ['-i', t.file]);
const delays = track.map((t, i) => `[${i + 1}:a]aresample=48000,adelay=${Math.round(t.video * 1000)}:all=1[a${i}]`).join(';');
const filter = `[0:v]crop=${VIEW.width}:${VIEW.height - 10}:0:0[c];[c][${track.length + 1}:v]overlay=14:H-h-14[v];${delays};${track.map((_, i) => `[a${i}]`).join('')}amix=inputs=${track.length}:normalize=0[a]`;
const r = spawnSync(ffmpegPath, ['-y', '-i', raw, ...inputs, '-i', BADGE, '-filter_complex', filter, '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', FINAL], { stdio: ['ignore', 'ignore', 'pipe'] });
if (r.status !== 0) throw new Error(r.stderr.toString().slice(-900));
// Taken just before the narration starts, so the thumbnail has no caption across it.
const trendAt = track.find((t) => t.file.endsWith('trend.wav')).video - 0.45;
spawnSync(ffmpegPath, ['-y', '-loglevel', 'error', '-ss', String(trendAt), '-i', FINAL, '-frames:v', '1', '-q:v', '2', POSTER]);
console.log('Video saved:', FINAL, `${(fs.statSync(FINAL).size / 1048576).toFixed(1)} MB`);
