// Renders made-up patient documents as messy scans, and saves the true values and their positions.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { HERO, OTHERS, HERO_FILES } from './demo-records.mjs';

const root = path.resolve(import.meta.dirname, '..');
const OUT = path.join(root, 'demo-data/documents');
const W = 900;
const H = 1200;
const age = (dob, on) => Math.floor((new Date(on) - new Date(dob)) / 31557600000);
const fmt = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const head = (p, d) => `<div class="pt"><div><b>Patient:</b> <span data-f="patient">${p.name}</span></div><div><b>File No:</b> ${p.mrn}</div><div><b>Date of birth:</b> ${fmt(p.dob)} (${age(p.dob, d)} y) &nbsp; <b>Sex:</b> ${p.sex}</div><div><b>Date:</b> ${fmt(d)}</div></div>`;
const wm = '<div class="wm">SYNTHETIC - DEMO DATA</div>';

function body(doc, p) {
  if (doc.kind === 'lab') {
    const rows = doc.labs.map((l, i) => `<tr data-f="lab:${i}"><td>${l[0]}</td><td><b>${l[1]}</b></td><td>${l[2]}</td><td>${l[3]}</td></tr>`).join('');
    return `<h1>Sunrise Diagnostic Laboratory</h1><div class="sub">Demo address, Lahore</div><h2>Laboratory Report</h2>${head(p, doc.date)}<table><tr><th>Test</th><th>Result</th><th>Unit</th><th>Normal range</th></tr>${rows}</table><p class="foot">Checked by: Demo Pathologist. End of report.</p>${wm}`;
  }
  if (doc.kind === 'summary') {
    const paras = doc.body.map((t, i) => `<p class="big" data-f="body:${i}">${t}</p>`).join('');
    return `<h1>City Care Hospital</h1><div class="sub">Demo address, Lahore</div><h2>${doc.title}</h2>${head(p, doc.date)}${paras}<p class="foot">Signed: Demo Consultant</p>${wm}`;
  }
  const dose = (m) => (m[1] === 'SMUDGE' ? '<span class="smudge"><i>5</i><i class="over">8</i><span>00</span> mg</span>' : m[1]);
  const meds = doc.meds.map((m, i) => `<div class="med" data-f="med:${i}">${i + 1}. ${m[0]} ${dose(m)} &mdash; ${m[2]}</div>`).join('');
  return `<div class="rxhead">${doc.clinic || 'Demo Family Clinic'}<small> Dr. Demo</small></div>${head(p, doc.date)}<div class="rx" style="font-family:'${doc.look.font}',cursive"><div class="sym">Rx</div>${meds}<div class="note">${doc.note}</div></div>${wm}`;
}

const css = `*{box-sizing:border-box}html,body{margin:0;background:#6b6b6b;width:${W}px;height:${H}px;overflow:hidden}
#s{position:absolute;inset:18px;background:#fbfaf6;padding:48px 56px;font:18px Arial,sans-serif;color:#1c1c1c;overflow:hidden}
h1{font-size:30px;margin:0;color:#14507a}.sub{color:#555;margin-bottom:14px}h2{font-size:21px;border-top:2px solid #14507a;border-bottom:2px solid #14507a;padding:8px 0;margin:6px 0 16px}
.pt{display:grid;grid-template-columns:1.3fr 1fr;gap:8px 18px;margin:12px 0 22px;font-size:17px}table{width:100%;border-collapse:collapse;font-size:20px}th,td{padding:13px 10px;border-bottom:1px solid #999;text-align:left}th{background:#e8edf1}
.foot{margin-top:50px;color:#444}.big{font-size:21px;line-height:1.6;margin:16px 0}.wm{position:absolute;right:30px;bottom:18px;font-size:13px;color:#a33;letter-spacing:1px}
.rxhead{font:700 30px Georgia,serif;color:#1d5b45;border-bottom:3px double #1d5b45;padding-bottom:10px}.rxhead small{font-size:17px;margin-left:14px;font-weight:400}
.rx{font-size:40px;color:#16306e;margin-top:14px;line-height:1.5}.sym{font-size:58px}.med{margin:12px 0}.note{margin-top:34px;font-size:35px}
.smudge{position:relative;display:inline-block}.smudge i{font-style:normal}.smudge .over{position:absolute;left:0;top:0;opacity:.75}.smudge:before{content:"";position:absolute;left:-7px;top:6px;width:36px;height:50px;background:radial-gradient(#16306e99,#16306e00 72%);filter:blur(3px)}
.fx{position:absolute;inset:0;pointer-events:none}`;
const fonts = '<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@500&family=Kalam&family=Reenie+Beanie&display=swap" rel="stylesheet">';

function html(doc, p) {
  const l = doc.look || {};
  const layers = [
    l.shadow && 'linear-gradient(115deg,#0005,#0000 42%)',
    l.crease && 'linear-gradient(180deg,#0000 49.6%,#0003 50%,#fff5 50.4%,#0000 51%)',
    l.tone === 'old' && 'linear-gradient(#caa96a33,#caa96a33)',
  ].filter(Boolean).join(',');
  return `<!doctype html><meta charset="utf-8">${fonts}<style>${css}</style><div id="s" style="transform:rotate(${l.rotate || 0}deg);filter:${l.blur ? `blur(${l.blur}px)` : 'none'}">${body(doc, p)}<svg class="fx" width="100%" height="100%" style="opacity:.09"><filter id="n"><feTurbulence baseFrequency=".85" numOctaves="2"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg><div class="fx" style="background:${layers || 'none'}"></div></div>`;
}

async function renderPage(page, doc, p, outFile) {
  await page.setContent(html(doc, p), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const boxes = await page.$$eval('[data-f]', (els) => els.map((e) => {
    const r = e.getBoundingClientRect();
    return { key: e.dataset.f, x: r.x, y: r.y, w: r.width, h: r.height };
  }));
  await page.screenshot({ path: outFile, type: 'jpeg', quality: 72 });
  return boxes.map((b) => ({ key: b.key, box_2d: [b.y / H, b.x / W, (b.y + b.h) / H, (b.x + b.w) / W].map((v) => Math.round(v * 1000)) }));
}

const truth = (doc, p, boxes, file, pageNo = 1) => ({
  file,
  page: pageNo,
  kind: doc.kind,
  date: doc.date,
  patient: p,
  labs: doc.labs,
  meds: doc.meds?.map((m) => ({ name: m[0], dose: m[1] === 'SMUDGE' ? '500 mg' : m[1], frequency: m[2], doubtful: m[1] === 'SMUDGE' })),
  allergy: doc.allergy,
  conditions: doc.conditions,
  unreadable: !!doc.unreadable,
  boxes,
});

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
const heroDir = path.join(OUT, 'rashid-mehmood');
const otherDir = path.join(OUT, 'other-patients');
const tmp = path.join(OUT, '.tmp');
for (const d of [heroDir, otherDir, tmp]) fs.mkdirSync(d, { recursive: true });

const labels = [];
for (const doc of HERO_FILES) {
  if (doc.kind === 'combined') {
    const imgs = [];
    for (const [i, pg] of doc.pages.entries()) {
      const f = path.join(tmp, `${pg.file}.jpg`);
      labels.push(truth(pg, HERO, await renderPage(page, pg, HERO, f), doc.file, i + 1));
      imgs.push(fs.readFileSync(f).toString('base64'));
    }
    const pdf = await browser.newPage();
    await pdf.setContent(`<style>@page{size:${W}px ${H}px;margin:0}body{margin:0}img{display:block;width:${W}px;height:${H}px;break-after:page}</style>${imgs.map((i) => `<img src="data:image/jpeg;base64,${i}">`).join('')}`, { waitUntil: 'load' });
    await pdf.pdf({ path: path.join(heroDir, doc.file), width: `${W}px`, height: `${H}px`, printBackground: true });
    await pdf.close();
    continue;
  }
  const p = doc.patient || HERO;
  labels.push(truth(doc, p, await renderPage(page, doc, p, path.join(heroDir, doc.file)), doc.file));
}

const others = [];
for (const o of OTHERS) {
  const doc = { kind: 'lab', date: o.date, labs: o.labs, look: { rotate: 0.3 } };
  const file = `${o.mrn}.jpg`;
  others.push({ ...o, file, boxes: await renderPage(page, doc, o, path.join(otherDir, file)) });
}

fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(path.join(root, 'demo-data/patients'), { recursive: true });
fs.writeFileSync(path.join(root, 'demo-data/patients/hero-labels.json'), JSON.stringify({ hero: HERO, documents: labels }, null, 1));
fs.writeFileSync(path.join(root, 'demo-data/patients/other-patients.json'), JSON.stringify(others, null, 1));
await browser.close();
console.log('hero files', fs.readdirSync(heroDir).length, 'pages labelled', labels.length, 'others', others.length);
