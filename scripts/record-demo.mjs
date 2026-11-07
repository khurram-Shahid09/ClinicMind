// Drives the real app through the demo. With --dry it only checks each step and saves screenshots.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';

const root = path.resolve(import.meta.dirname, '..');
const DRY = process.argv.includes('--dry');
const OUT = path.join(root, 'demo-video');
const SHOTS = path.join(OUT, 'shots');
const AUDIO = path.join(OUT, 'audio');
const BASE = 'http://localhost:3000';
const VIEW = { width: 1440, height: 810 };
fs.mkdirSync(SHOTS, { recursive: true });
const narration = JSON.parse(fs.readFileSync(path.join(root, 'scripts/narration.json'), 'utf8'));
const DICTATION_WAV = path.join(root, 'demo-data/audio/sample-dictation.wav');
const DICTATION_TEXT = 'Doctor: "Patient complains of sore throat for three days. Throat is red, no fever. Prescribe amoxicillin 500 mg, three times a day, for five days. Continue metformin 500 mg, twice a day. Drink warm fluids and come back after two weeks."';

function wavSeconds(file) {
  const b = fs.readFileSync(file);
  const rate = b.readUInt32LE(24);
  const bytes = b.readUInt16LE(34) / 8 * b.readUInt16LE(22);
  return (b.length - 44) / (rate * bytes);
}

const OVERLAY = () => {
  const add = () => {
    if (document.getElementById('demo-caption')) return;
    const style = document.createElement('style');
    style.textContent = `#demo-caption{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);width:min(1040px,86vw);padding:12px 20px;border-radius:12px;background:#071a1fe8;color:#fff;font:600 20px/1.35 Inter,Arial,sans-serif;text-align:center;z-index:99990;opacity:0;transition:opacity .25s;pointer-events:none}
#demo-cursor{position:fixed;left:0;top:0;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:#ffb300cc;border:2px solid #fff;box-shadow:0 1px 6px #0007;z-index:99999;pointer-events:none;transition:transform .08s}
#demo-card{position:fixed;inset:0;display:none;place-content:center;gap:16px;background:linear-gradient(135deg,#0a3a40,#0d7a78);color:#fff;text-align:center;z-index:99980;font-family:Inter,Arial,sans-serif;padding:60px}
#demo-sync{position:fixed;left:0;bottom:0;width:10px;height:10px;background:#fff;z-index:100000;pointer-events:none}#demo-caption.top{top:12px;bottom:auto;width:760px;font-size:17px;padding:8px 16px}#demo-card h1{font-size:64px;margin:0}#demo-card p{font-size:28px;margin:0 auto;max-width:980px;line-height:1.4}#demo-card small{display:block;margin-top:18px;font-size:18px;opacity:.85}`;
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

const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
await fetch(`${BASE}/api/v1/demo/reset`, { method: 'POST' });
const context = await browser.newContext({
  viewport: VIEW,
  deviceScaleFactor: 1,
  ...(DRY ? {} : { recordVideo: { dir: path.join(OUT, 'raw'), size: VIEW } }),
});
await context.addInitScript(OVERLAY);
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`page: ${e.message}`));
page.on('response', (r) => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
const t0 = Date.now();
const track = [];
const wait = (ms) => (DRY ? Promise.resolve() : page.waitForTimeout(ms));
const shot = (name) => (DRY ? page.screenshot({ path: path.join(SHOTS, `${name}.png`) }) : Promise.resolve());

async function caption(text) {
  await page.evaluate((t) => { const c = document.getElementById('demo-caption'); if (c) { if (t) c.textContent = t; c.style.opacity = t ? 1 : 0; } }, text);
}
async function card(html) {
  await page.evaluate((h) => { const c = document.getElementById('demo-card'); c.innerHTML = h; c.style.display = h ? 'grid' : 'none'; }, html);
}
// Each line gets its own marker shade, so its audio can be placed at the frame where the marker appears.
const level = (i) => 30 + i * 11;
async function mark(file) {
  const i = track.length;
  await page.evaluate((v) => { document.getElementById('demo-sync').style.background = `rgb(${v},${v},${v})`; }, level(i));
  track.push({ file, at: (Date.now() - t0) / 1000 });
}
async function say(name, action, position = '') {
  const file = path.join(AUDIO, `${name}.wav`);
  const seconds = wavSeconds(file);
  await page.evaluate((c) => { document.getElementById('demo-caption').className = c; }, position);
  await caption(narration[name]);
  await mark(file);
  const started = Date.now();
  if (action) await action();
  const left = seconds * 1000 + 350 - (Date.now() - started);
  if (left > 0) await wait(left);
  await caption('');
}
const el = (id) => page.getByTestId(id).first();
async function pointAt(locator) {
  await locator.waitFor({ state: 'visible', timeout: 120000 });
  // Keep the item in the middle of the screen, clear of the caption.
  await locator.evaluate((e) => e.scrollIntoView({ block: 'center' }));
  await wait(150);
  const b = await locator.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: DRY ? 1 : 22 });
  await wait(250);
}
async function click(locator) {
  await pointAt(locator);
  await locator.click();
  await wait(250);
}
const clickId = (id) => click(el(id));
const nav = (name) => click(page.getByRole('link', { name, exact: false }).first());

// Scene: introduction
await page.goto(BASE);
await page.mouse.move(700, 400);
await card('<h1>ClinicMind</h1><p>AI helpers that turn a pile of old patient records into a clear story the doctor can check.</p><small>Demo with made-up patients. Not for real patient care.</small>');
await say('intro');
await card('');

// Scene: morning brief
await el('today-CM-1042').waitFor();
await say('today', async () => { await wait(2500); await pointAt(el('open-CM-1042')); });
await shot('01-today');
await clickId('open-CM-1042');

// Scene: patient and replay
await el('play-story').waitFor();
await say('patient', async () => { await wait(1500); await pointAt(el('play-story')); });
await shot('02-patient');
await clickId('play-story');
await el('replay').waitFor();
if (!DRY) await say('replay', () => page.getByTestId('trend-card').waitFor({ timeout: 60000 }).then(() => {}), 'top');
else {
  await page.waitForTimeout(6000);
  await page.screenshot({ path: path.join(SHOTS, '03-replay-mid.png') });
  await page.getByRole('slider').fill('1');
}
await el('trend-card').waitFor({ timeout: 60000 });
await say('trend', async () => { await wait(4000); await pointAt(el('trend-card').getByTestId('source-chip')); }, 'top');
await shot('04-trend');

// Scene: original source
await click(el('trend-card').getByTestId('source-chip'));
await el('source-viewer').waitFor();
await page.waitForLoadState('networkidle');
await say('source', async () => { await wait(2800); await click(el('source-next')); await wait(1200); await click(el('source-next')); });
await shot('05-source');
await clickId('source-close');
await clickId('replay-close');

// Scene: live agent board
await nav('Add Records');
await el('use-sample').waitFor();
await say('board', async () => { await wait(800); await clickId('use-sample'); await page.waitForTimeout(5000); await shot('06-board-mid'); });
await el('board-done').waitFor({ timeout: 240000 });
await say('board_done');
await shot('07-board-done');

// Scene: needs checking
await clickId('go-checking');
await el('review-value').waitFor();
await page.waitForLoadState('networkidle');
await shot('08-review');
await say('review', async () => { await wait(2500); await pointAt(page.getByTestId('option-500 mg')); await wait(3000); await click(page.getByTestId('option-500 mg')); await el('resolved').waitFor(); });
await say('review_other', async () => { await pointAt(el('keep-out')); await wait(2200); await clickId('keep-out'); await wait(600); await pointAt(el('clearer-photo')); await wait(1200); await clickId('clearer-photo'); });
await shot('09-all-checked');
await clickId('see-activity');
await el('activity').waitFor();
await say('activity');
await shot('10-activity');

// Scene: ask in Urdu
await nav('Today');
await clickId('open-CM-1042');
await el('ask-input').waitFor();
await say('ask', async () => {
  await pointAt(el('ask-input'));
  await el('ask-input').click();
  await page.keyboard.type('Pichli visit se kya change hua?', { delay: DRY ? 0 : 55 });
  await wait(400);
  await clickId('ask-send');
  await el('ask-answer').waitFor({ timeout: 180000 });
  await el('ask-answer').evaluate((e) => e.scrollIntoView({ block: 'center' }));
  await wait(4500);
  await click(el('ask-answer').getByTestId('source-chip'));
  await el('source-viewer').waitFor();
});
await shot('11-ask-source');
await clickId('source-close');
await shot('12-ask');

// Scene: visit
await page.evaluate(() => scrollTo(0, 0));
await clickId('start-visit');
await el('sample-dictation').waitFor();
await say('dictate');
await pointAt(el('sample-dictation'));
await caption(DICTATION_TEXT);
await mark(DICTATION_WAV);
await wait(wavSeconds(DICTATION_WAV) * 1000 + 300);
await caption('');
await clickId('sample-dictation');
await el('alert-allergy').waitFor({ timeout: 180000 });
await shot('13-alert');
await say('alert', async () => {
  await wait(600);
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
  await shot('14-after-change');
});
await clickId('approve');
await el('approved').waitFor();

// Scene: documents
await say('documents', async () => {
  await clickId('make-urdu');
  await el('doc-patient_instructions').waitFor({ timeout: 180000 });
  await el('doc-patient_instructions').evaluate((e) => e.scrollIntoView({ block: 'center' }));
  await shot('15-urdu');
  await wait(2400);
  await clickId('approve-patient_instructions');
  await el('doc-approved-patient_instructions').waitFor();
  await clickId('make-referral');
  await el('doc-referral_letter').waitFor({ timeout: 180000 });
  await el('doc-referral_letter').evaluate((e) => e.scrollIntoView({ block: 'center' }));
  await wait(1200);
  await clickId('approve-referral_letter');
  await el('doc-approved-referral_letter').waitFor();
  await shot('16-letter');
});
await wait(800);

// Scene: follow-up and end of day
await page.evaluate(() => scrollTo(0, 0));
await nav('Follow-ups');
await el('follow-up').waitFor({ timeout: 180000 });
await say('followup', async () => { await wait(2800); await clickId('follow-up-approve'); await el('follow-up-approved').waitFor(); });
await shot('17-follow-up');
await nav('End of Day');
await el('end-of-day').waitFor();
await say('endofday');
await shot('18-end-of-day');

// Scene: close
await card('<h1>ClinicMind</h1><p>The patient\'s full story, with proof, before the doctor decides.</p><small>Demo with made-up patients. Not a medical device. The doctor makes all medical decisions.</small>');
await say('close');
await wait(1200);

const video = DRY ? null : page.video();
await context.close();
await browser.close();
if (errors.length) console.log('Problems seen:\n' + [...new Set(errors)].join('\n'));
if (DRY) {
  console.log('Dry run passed.');
  process.exit(0);
}

const raw = await video.path();
// Find the frame where each marker first appears.
const FPS = 10;
const probe = spawnSync(ffmpegPath, ['-loglevel', 'error', '-i', raw, '-vf', `fps=${FPS},crop=4:4:2:${VIEW.height - 7},scale=1:1:flags=area,format=gray`, '-f', 'rawvideo', '-'], { maxBuffer: 1 << 26 });
const shades = probe.stdout;
let from = 0;
let clock = 0;
for (const [i, t] of track.entries()) {
  let found = -1;
  for (let f = from; f < shades.length; f += 1) {
    if (Math.abs(shades[f] - level(i)) <= 3) { found = f; break; }
  }
  if (found < 0) throw new Error(`Marker ${i} was not found in the video.`);
  from = found;
  // Never let one narration line start before the previous one ends.
  t.video = Math.max(found / FPS, clock);
  clock = t.video + wavSeconds(t.file) + 0.15;
}
fs.writeFileSync(path.join(OUT, 'track.json'), JSON.stringify(track.map((t) => ({ name: path.basename(t.file, '.wav'), wall: +t.at.toFixed(1), video: +t.video.toFixed(1) })), null, 1));
const inputs = track.flatMap((t) => ['-i', t.file]);
const delays = track.map((t, i) => `[${i + 1}:a]aresample=48000,adelay=${Math.round(t.video * 1000)}:all=1[a${i}]`).join(';');
const mix = `${delays};${track.map((_, i) => `[a${i}]`).join('')}amix=inputs=${track.length}:normalize=0[a]`;
const final = path.join(OUT, 'ClinicMind-Demo.mp4');
// Cropping the bottom edge removes the marker from the finished video.
const r = spawnSync(ffmpegPath, ['-y', '-i', raw, ...inputs, '-filter_complex', `[0:v]crop=${VIEW.width}:${VIEW.height - 10}:0:0[v];${mix}`, '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', final], { stdio: ['ignore', 'ignore', 'pipe'] });
if (r.status !== 0) throw new Error(r.stderr.toString().slice(-800));
console.log('Video saved:', final, `${(fs.statSync(final).size / 1048576).toFixed(1)} MB`);
