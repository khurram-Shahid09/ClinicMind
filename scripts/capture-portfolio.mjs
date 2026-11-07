// Captures clean screens from the running app for the portfolio case study.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.argv[2];
if (!OUT) throw new Error('Pass the output folder.');
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3000';
const API = `${BASE}/api/v1`;

await fetch(`${API}/demo/reset`, { method: 'POST' });
const hero = (await (await fetch(`${API}/patients`)).json()).find((p) => p.mrn === 'CM-1042');
const c = await (await fetch(`${API}/patients/${hero.id}/connected`)).json();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const el = (id) => page.getByTestId(id).first();
const shot = async (name) => {
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log('saved', name);
};
const center = (locator) => locator.evaluate((e) => e.scrollIntoView({ block: 'center' }));
const portal = async () => {
  await page.goto(`${BASE}/my/${c.portal_token}`);
  await el('birth-year').fill(String(new Date(hero.dob).getFullYear()));
  await el('unlock').click();
  await el('tab-home').waitFor();
};

await page.goto(BASE);
await el('open-CM-1042').waitFor();
await shot('today');

await page.goto(`${BASE}/patients/${hero.id}/story`);
await el('replay').waitFor();
await page.waitForTimeout(1000);
await page.getByRole('slider').fill('1');
await el('trend-card').waitFor();
await shot('story');
await el('trend-card').getByTestId('source-chip').click();
await el('source-viewer').waitFor();
await page.waitForLoadState('networkidle');
await shot('source');

await page.goto(`${BASE}/add-records`);
await el('use-sample').click();
await el('board-done').waitFor({ timeout: 120000 });
await shot('board');
await el('go-checking').click();
await el('review-value').waitFor();
await page.waitForLoadState('networkidle');
await shot('review');
await page.getByTestId('option-500 mg').click();
await el('resolved').waitFor();

await page.goto(`${BASE}/patients/${hero.id}`);
await el('ask-input').fill('Pichli visit se kya change hua?');
await el('ask-send').click();
await el('ask-answer').waitFor({ timeout: 90000 });
await center(el('ask-answer'));
await shot('ask-urdu');

await page.goto(`${BASE}/visits/${hero.id}/${c.queue.visit_id}`);
await el('sample-dictation').click();
await el('alert-allergy').waitFor({ timeout: 90000 });
await center(el('alert-allergy'));
await shot('allergy-alert');

await page.goto(`${BASE}/alerts`);
await el('run-alerts').click();
await el('alerts-created').waitFor();
await center(el('message-list'));
await shot('auto-alerts');

await portal();
await shot('patient-home');
await el('lang-toggle').click();
await shot('patient-urdu');
await el('lang-toggle').click();
await el('tab-reports').click();
await el('pt-lab-hb').waitFor();
await shot('patient-reports');
await el('tab-readings').click();
await el('reading-1').fill('188');
await el('reading-2').fill('112');
await el('reading-save').click();
await el('reading-flag').waitFor();
await shot('patient-reading');

await page.goto(`${BASE}/patients/${hero.id}`);
await el('show-qr').click();
await el('qr-code').waitFor();
await shot('patient-qr');

await portal();
await el('check-in').click();
await el('pt-token').waitFor();
await page.goto(`${BASE}/waiting-room`);
await el('waiting-room').waitFor();
await shot('waiting-room');

await page.goto(`${BASE}/e/${c.emergency_token}`);
await el('emergency-card').waitFor();
await shot('emergency-card');

await page.goto(`${BASE}/pulse`);
await el('pulse').waitFor();
await shot('clinic-pulse');

await browser.close();
await fetch(`${API}/demo/reset`, { method: 'POST' });
console.log('done');
