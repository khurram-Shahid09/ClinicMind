// Captures a clean thumbnail for the short demo from the running app.
import { chromium } from 'playwright';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';

const OUT = path.resolve(import.meta.dirname, '../demo-video');
const BASE = 'http://localhost:3000';
const hero = (await (await fetch(`${BASE}/api/v1/patients`)).json()).find((p) => p.mrn === 'CM-1042');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 800 } });
await page.goto(`${BASE}/patients/${hero.id}/story`);
await page.getByTestId('replay').waitFor();
await page.waitForTimeout(1000);
await page.getByRole('slider').fill('1');
await page.getByTestId('trend-card').waitFor();
await page.waitForTimeout(1500);
const png = path.join(OUT, 'poster-clean.png');
await page.screenshot({ path: png });
await browser.close();
const out = path.join(OUT, 'ClinicMind-Short-Demo-Poster.jpg');
const r = spawnSync(ffmpegPath, ['-y', '-loglevel', 'error', '-i', png, '-i', path.join(OUT, 'name-badge.png'), '-filter_complex', 'overlay=14:H-h-14', '-q:v', '2', out]);
if (r.status !== 0) throw new Error(r.stderr.toString());
console.log('Poster saved:', out);
