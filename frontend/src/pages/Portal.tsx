import { FormEvent, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { BASE_URL, prettyDate } from '../api';
import { Sparkline } from '../components';

type Lang = 'en' | 'ur';
const T: Record<string, [string, string]> = {
  home: ['Home', 'ہوم'], reports: ['Reports', 'رپورٹس'], medicine: ['Medicine', 'دوا'], readings: ['Readings', 'ریڈنگ'], card: ['My card', 'میرا کارڈ'],
  hello: ['Hello', 'السلام علیکم'], next: ['Your next visit', 'آپ کی اگلی وزٹ'], checkin: ["I'm here. Check me in", 'میں پہنچ گیا ہوں، چیک اِن کریں'],
  token: ['Your token', 'آپ کا ٹوکن'], ahead: ['people ahead of you', 'لوگ آپ سے پہلے ہیں'], about: ['About', 'تقریباً'], minutes: ['minutes', 'منٹ'], yourturn: ["It's your turn", 'آپ کی باری ہے'],
  prep: ['Before your visit', 'وزٹ سے پہلے'], prepq: ['What is bothering you today?', 'آج آپ کو کیا تکلیف ہے؟'], askdoc: ['A question for your doctor', 'ڈاکٹر کے لیے سوال'], send: ['Send to my doctor', 'ڈاکٹر کو بھیجیں'], sent: ['Sent to your doctor', 'ڈاکٹر کو بھیج دیا گیا'],
  urgent: ['Chest pain can be serious. If it is severe or sudden, go to the nearest emergency department now. Do not wait for your visit.', 'سینے کا درد سنگین ہو سکتا ہے۔ اگر درد شدید یا اچانک ہو تو ابھی قریبی ایمرجنسی میں جائیں۔ وزٹ کا انتظار نہ کریں۔'],
  inbox: ['Messages from your clinic', 'کلینک کے پیغامات'], due: ['Due now', 'ابھی کروانا ہے'], book: ['Book it', 'وقت لیں'], booked: ['Your clinic has your request', 'کلینک کو آپ کی درخواست مل گئی'],
  instr: ['How to take your medicine', 'دوا کیسے لیں'], listen: ['Listen in Urdu', 'اردو میں سنیں'],
  yourreports: ['Your test results', 'آپ کے ٹیسٹ کے نتائج'], inrange: ['Within the usual range on your report', 'رپورٹ کی عام حد کے اندر'], outrange: ['Outside the usual range. Please ask your doctor.', 'عام حد سے باہر۔ براہِ کرم ڈاکٹر سے پوچھیں۔'], orig: ['See original report', 'اصل رپورٹ دیکھیں'], history: ['My full history', 'میری پوری ہسٹری'],
  todaymeds: ["Today's medicine", 'آج کی دوا'], tick: ['Tick each dose after you take it.', 'ہر خوراک لینے کے بعد نشان لگائیں۔'], ticked: ['of doses ticked in the last 14 days', 'خوراکوں پر پچھلے 14 دنوں میں نشان لگا'], morning: ['Morning', 'صبح'], afternoon: ['Afternoon', 'دوپہر'], evening: ['Evening', 'شام'], night: ['Night', 'رات'],
  addreading: ['Add a home reading', 'گھر کی ریڈنگ لکھیں'], bp: ['Blood pressure', 'بلڈ پریشر'], sugar: ['Blood sugar', 'شوگر'], save: ['Save', 'محفوظ کریں'], top: ['Top number', 'اوپر والا نمبر'], bottom: ['Bottom number', 'نیچے والا نمبر'], value: ['Reading', 'ریڈنگ'],
  high: ['This reading is outside the limit set by your clinic. Your doctor has been told. Please contact the clinic today. If you feel unwell, go to the nearest emergency department.', 'یہ ریڈنگ کلینک کی مقرر کردہ حد سے باہر ہے۔ ڈاکٹر کو بتا دیا گیا ہے۔ براہِ کرم آج ہی کلینک سے رابطہ کریں۔ طبیعت خراب ہو تو قریبی ایمرجنسی میں جائیں۔'], ok: ['Saved. Your doctor can see it.', 'محفوظ ہو گیا۔ ڈاکٹر اسے دیکھ سکتے ہیں۔'], recent: ['Recent readings', 'حالیہ ریڈنگز'],
  emergency: ['Emergency card', 'ایمرجنسی کارڈ'], emhelp: ['In an emergency, a doctor can scan this to see your allergies and medicines.', 'ایمرجنسی میں ڈاکٹر اسے سکین کر کے آپ کی الرجی اور دوائیں دیکھ سکتے ہیں۔'], open: ['Open card', 'کارڈ کھولیں'],
  share: ['Share with another doctor', 'دوسرے ڈاکٹر کے ساتھ شیئر کریں'], sharehelp: ['Creates a private link that ends by itself after 48 hours.', 'ایک نجی لنک بنتا ہے جو 48 گھنٹے بعد خود ختم ہو جاتا ہے۔'], makeshare: ['Create share link', 'شیئر لنک بنائیں'], stop: ['Stop sharing', 'شیئرنگ بند کریں'], ends: ['Ends', 'ختم ہوگا'],
  who: ['Who opened my record', 'میرا ریکارڈ کس نے کھولا'], family: ['Family helper', 'گھر کا مددگار'], allergy: ['Allergies', 'الرجی'], unlock: ['Open my health page', 'میرا صفحہ کھولیں'], yearq: ['To keep this private, enter your birth year.', 'رازداری کے لیے اپنی پیدائش کا سال لکھیں۔'], demo: ['Demo with made-up patients', 'فرضی مریضوں کے ساتھ ڈیمو'],
};
const SYMPTOMS: [string, string, string][] = [['Fever', 'بخار', 'Fever'], ['Sore throat', 'گلے میں درد', 'Sore throat'], ['Tiredness', 'تھکاوٹ', 'Tiredness'], ['Headache', 'سر درد', 'Headache'], ['Chest pain', 'سینے میں درد', 'Chest pain'], ['Dizziness', 'چکر', 'Dizziness']];

function Unlock({ name, onDone, lang }: { name: string; onDone: (y: string) => void; lang: Lang }) {
  const [year, setYear] = useState('');
  const [error, setError] = useState('');
  const t = (k: string) => T[k][lang === 'en' ? 0 : 1];
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await onDoneCheck(year);
    if (!ok) setError(lang === 'en' ? 'That birth year does not match.' : 'پیدائش کا سال درست نہیں۔');
  };
  const onDoneCheck = async (y: string) => { try { await Promise.resolve(onDone(y)); return true; } catch { return false; } };
  return (
    <form className="pt-pad pt-unlock" onSubmit={submit}>
      <div className="logo-mark" style={{ width: 54, height: 54, fontSize: 32, margin: '0 auto' }}>+</div>
      <h2 style={{ textAlign: 'center', margin: '14px 0 2px', fontSize: 24 }}>{t('hello')}, {name}</h2>
      <p className="muted" style={{ textAlign: 'center', marginBottom: 18 }}>{t('yearq')}</p>
      <input inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} placeholder="1968" aria-label={t('yearq')} data-testid="birth-year" style={{ textAlign: 'center', fontSize: 22 }} />
      {error && <div className="notice red small" style={{ marginTop: 10 }}>{error}</div>}
      <button className="btn primary big" style={{ width: '100%', marginTop: 12 }} data-testid="unlock">{t('unlock')}</button>
    </form>
  );
}

export default function Portal() {
  const { token } = useParams();
  const [lang, setLang] = useState<Lang>('en');
  const [hello, setHello] = useState<any>(null);
  const [year, setYear] = useState<string | null>(null);
  const [d, setD] = useState<any>(null);
  const [tab, setTab] = useState('home');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [question, setQuestion] = useState('');
  const [kind, setKind] = useState('bp');
  const [v1, setV1] = useState('');
  const [v2, setV2] = useState('');
  const [result, setResult] = useState<{ flagged: boolean } | null>(null);
  const [report, setReport] = useState<string | null>(null);
  const [error, setError] = useState('');
  const audio = useRef<HTMLAudioElement>(null);
  const t = (k: string) => T[k][lang === 'en' ? 0 : 1];
  const rtl = lang === 'ur';

  useEffect(() => { fetch(`${BASE_URL}/portal/${token}/hello`).then((r) => (r.ok ? r.json() : Promise.reject())).then(setHello).catch(() => setError('This link is not valid.')); }, [token]);

  const call = async (path: string, init?: RequestInit, y = year) => {
    const res = await fetch(`${BASE_URL}/portal/${token}${path}`, { ...init, headers: { 'X-Birth-Year': y || '', 'Content-Type': 'application/json' } });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Something went wrong.');
    return res.json();
  };
  const load = async (y = year, refresh = true) => setD(await call(refresh ? '?refresh=true' : '', undefined, y));
  useEffect(() => { if (!year) return undefined; const i = setInterval(() => load().catch(() => {}), 2500); return () => clearInterval(i); }, [year]);
  const post = async (path: string, body?: unknown) => { const r = await call(path, { method: 'POST', body: JSON.stringify(body ?? {}) }); await load(); return r; };
  const unlock = async (y: string) => { await load(y, false); setYear(y); };

  const header = (
    <div className="pt-top">
      <span className="logo" style={{ fontSize: 17 }}><span className="logo-mark" style={{ width: 26, height: 26, fontSize: 16 }}>+</span>ClinicMind</span>
      <button className="chip" onClick={() => setLang(lang === 'en' ? 'ur' : 'en')} data-testid="lang-toggle">{lang === 'en' ? 'اردو' : 'English'}</button>
    </div>
  );

  const shell = (children: React.ReactNode, bottom?: React.ReactNode) => (
    <div className="pt-stage">
      <div className="pt-phone" data-testid="portal" dir={rtl ? 'rtl' : 'ltr'} lang={lang}>
        {header}
        <div className={`pt-scroll ${rtl ? 'pt-ur' : ''}`}>{children}</div>
        {bottom}
        <div className="pt-demo">{t('demo')}</div>
      </div>
    </div>
  );

  if (error) return shell(<div className="pt-pad"><div className="notice red">{error}</div></div>);
  if (!hello) return shell(null);
  if (!d) return shell(<Unlock name={hello.first_name} lang={lang} onDone={unlock} />);

  const nav = (
    <nav className="pt-nav">
      {[['home', '⌂'], ['reports', '▤'], ['medicine', '✚'], ['readings', '♥'], ['card', '▦']].map(([k, icon]) => (
        <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)} data-testid={`tab-${k}`}><span>{icon}</span>{t(k)}</button>
      ))}
    </nav>
  );
  const q = d.queue;
  const saveReading = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const r = await post('/readings', { kind, value: Number(v1), value2: kind === 'bp' ? Number(v2) : null });
      setResult(r); setV1(''); setV2('');
    } catch (err: any) { setError(err.message); }
  };
  const openReport = async (factId: number) => { const r = await call(`/source/${factId}`); setReport(r.image_url); };

  return shell(<>
    {tab === 'home' && <div className="pt-pad stack">
      <h2 style={{ margin: 0, fontSize: 23 }}>{t('hello')}, {d.name.split(' ')[0]}</h2>
      {q ? (
        <section className="pt-card pt-hero" data-testid="pt-queue">
          {!q.checked_in && <>
            <p className="small">{t('next')}</p>
            <div className="big-value" dir="ltr">{prettyDate(d.today)}, {q.time}</div>
            <p className="small" style={{ margin: '2px 0 10px' }} dir="ltr">{d.doctor}</p>
            <button className="btn big" style={{ width: '100%' }} data-testid="check-in" onClick={() => post('/checkin')}>{t('checkin')}</button>
          </>}
          {q.checked_in && q.status === 'waiting' && <>
            <p className="small">{t('token')}</p>
            <div className="pt-token" data-testid="pt-token">{q.token}</div>
            <p><strong>{q.ahead}</strong> {t('ahead')}. {t('about')} <strong>{q.minutes}</strong> {t('minutes')}.</p>
          </>}
          {q.checked_in && q.status !== 'waiting' && <div className="big-value">{t('yourturn')}</div>}
        </section>
      ) : d.next_visit && <section className="pt-card pt-hero"><p className="small">{t('next')}</p><div className="big-value" dir="ltr">{prettyDate(d.next_visit.date)}, {d.next_visit.visit_time}</div></section>}

      {q && <section className="pt-card" data-testid="pt-previsit">
        <h3>{t('prep')}</h3>
        {d.previsit ? <div className="notice green small" data-testid="previsit-sent">✓ {t('sent')}</div> : <>
          <p className="small muted" style={{ marginBottom: 8 }}>{t('prepq')}</p>
          <div className="row" style={{ marginBottom: 9 }}>
            {SYMPTOMS.map(([key, ur]) => <button key={key} className={`sym ${symptoms.includes(key) ? 'on' : ''}`} data-testid={`sym-${key}`} onClick={() => setSymptoms(symptoms.includes(key) ? symptoms.filter((s) => s !== key) : [...symptoms, key])}>{lang === 'en' ? key : ur}</button>)}
          </div>
          {symptoms.includes('Chest pain') && <div className="notice red small" style={{ marginBottom: 9 }} data-testid="urgent-warning">{t('urgent')}</div>}
          <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder={t('askdoc')} aria-label={t('askdoc')} data-testid="previsit-question" />
          <button className="btn primary" style={{ width: '100%', marginTop: 8 }} disabled={!symptoms.length && !question} data-testid="previsit-send" onClick={() => post('/previsit', { symptoms, question })}>{t('send')}</button>
        </>}
      </section>}

      {d.messages.length > 0 && <section className="pt-card" data-testid="pt-inbox">
        <h3>{t('inbox')}</h3>
        {d.messages.slice(0, 3).map((m: any) => (
          <div key={m.id} className="pt-msg">
            <p className={rtl ? '' : ''}>{lang === 'en' ? m.body_en : m.body_ur}</p>
            {m.reply ? <p className="small" style={{ color: 'var(--green)', fontWeight: 600 }}>✓ {t('booked')}</p> : m.body_en.includes('BOOK') && <button className="btn small primary" data-testid="reply-book" onClick={() => post(`/messages/${m.id}/reply`, { reply: 'BOOK' })}>{t('book')}</button>}
          </div>
        ))}
      </section>}

      {d.instructions.length > 0 && <section className="pt-card" data-testid="pt-instructions">
        <div className="between"><h3 style={{ margin: 0 }}>{t('instr')}</h3>{d.has_audio && <button className="chip" data-testid="listen" onClick={() => audio.current?.play().catch(() => {})}>▶ {t('listen')}</button>}</div>
        <audio ref={audio} src={`${BASE_URL}/demo/urdu-instructions-audio`} preload="none" />
        {d.instructions.map((i: any) => <div key={i.name} className="list-line"><strong dir="ltr">{i.name}</strong><p className="urdu" style={{ fontSize: 17, lineHeight: 2 }}>{i.urdu}</p></div>)}
      </section>}
    </div>}

    {tab === 'reports' && <div className="pt-pad stack" data-testid="pt-reports">
      <h2 style={{ margin: 0 }}>{t('yourreports')}</h2>
      {d.labs.map((l: any) => (
        <section key={l.code} className="pt-card" data-testid={`pt-lab-${l.code}`}>
          <div className="between"><strong>{l.name}</strong><span className="big-value" dir="ltr">{l.value} <small className="small muted">{l.unit}</small></span></div>
          <p className="small muted">{lang === 'en' ? l.meaning?.en : l.meaning?.ur}</p>
          <Sparkline points={l.history} height={50} color={l.outside ? '#b86e00' : '#0d7a78'} />
          <p className="small" style={{ color: l.outside ? 'var(--amber)' : 'var(--green)', fontWeight: 600 }}>{l.outside ? t('outrange') : t('inrange')}</p>
          <button className="chip" style={{ marginTop: 6 }} data-testid={`orig-${l.code}`} onClick={() => openReport(l.fact_id)}>▣ {t('orig')}</button>
        </section>
      ))}
      <section className="pt-card">
        <h3>{t('history')}</h3>
        {d.history.slice(0, 8).map((h: any) => <div key={h.id} className="list-line between small"><span>{({ lab_report: lang === 'en' ? 'Lab report' : 'لیب رپورٹ', prescription: lang === 'en' ? 'Prescription' : 'نسخہ', summary: lang === 'en' ? 'Hospital letter' : 'ہسپتال کا خط' } as any)[h.doc_type]}</span><span className="muted" dir="ltr">{prettyDate(h.date)}</span></div>)}
      </section>
    </div>}

    {tab === 'medicine' && <div className="pt-pad stack" data-testid="pt-medicine">
      <h2 style={{ margin: 0 }}>{t('todaymeds')}</h2>
      <p className="small muted">{t('tick')}</p>
      {d.medicines.map((m: any) => (
        <section key={m.key} className="pt-card">
          <strong dir="ltr">{m.name} {m.dose}</strong>
          <div className="row" style={{ marginTop: 8 }}>
            {m.slots.map((s: any) => <button key={s.slot} className={`dose ${s.taken ? 'on' : ''}`} data-testid={`dose-${m.key}-${s.slot}`} onClick={() => post('/doses', { medicine: m.key, slot: s.slot, taken: !s.taken })}>{s.taken ? '✓ ' : ''}{t(s.slot)}</button>)}
          </div>
        </section>
      ))}
      {d.adherence !== null && <section className="pt-card" style={{ textAlign: 'center' }} data-testid="pt-adherence"><div className="stat" dir="ltr">{d.adherence}%</div><p className="small muted">{t('ticked')}</p></section>}
    </div>}

    {tab === 'readings' && <div className="pt-pad stack" data-testid="pt-readings">
      <form className="pt-card" onSubmit={saveReading}>
        <h3>{t('addreading')}</h3>
        <div className="row" style={{ marginBottom: 9 }}>
          {['bp', 'sugar'].map((k) => <button type="button" key={k} className={`sym ${kind === k ? 'on' : ''}`} onClick={() => { setKind(k); setResult(null); }}>{t(k)}</button>)}
        </div>
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <input inputMode="numeric" value={v1} onChange={(e) => setV1(e.target.value)} placeholder={kind === 'bp' ? t('top') : t('value')} aria-label={kind === 'bp' ? t('top') : t('value')} data-testid="reading-1" />
          {kind === 'bp' && <input inputMode="numeric" value={v2} onChange={(e) => setV2(e.target.value)} placeholder={t('bottom')} aria-label={t('bottom')} data-testid="reading-2" />}
        </div>
        <button className="btn primary" style={{ width: '100%', marginTop: 8 }} disabled={!v1 || (kind === 'bp' && !v2)} data-testid="reading-save">{t('save')}</button>
        {result && <div className={`notice small ${result.flagged ? 'red' : 'green'}`} style={{ marginTop: 10 }} data-testid={result.flagged ? 'reading-flag' : 'reading-ok'}>{result.flagged ? t('high') : t('ok')}</div>}
      </form>
      <section className="pt-card">
        <h3>{t('recent')}</h3>
        {d.readings.map((r: any, i: number) => <div key={i} className="list-line between small"><span dir="ltr" style={r.flagged ? { color: 'var(--red)', fontWeight: 700 } : undefined}>{r.kind === 'bp' ? `${r.value}/${r.value2}` : r.value}</span><span className="muted" dir="ltr">{prettyDate(r.date)}</span></div>)}
      </section>
    </div>}

    {tab === 'card' && <div className="pt-pad stack" data-testid="pt-card">
      <section className="pt-card" style={{ textAlign: 'center' }}>
        <h3 style={{ color: 'var(--red)' }}>{t('emergency')}</h3>
        <div className="qr-box"><QRCodeSVG value={`${window.location.origin}/e/${d.emergency_token}`} size={136} /></div>
        <p className="small muted" style={{ margin: '8px 0' }}>{t('emhelp')}</p>
        <a className="btn" href={`/e/${d.emergency_token}`} data-testid="open-emergency">{t('open')}</a>
      </section>
      <section className="pt-card">
        <h3>{t('share')}</h3>
        <p className="small muted" style={{ marginBottom: 8 }}>{t('sharehelp')}</p>
        {d.shares.filter((s: any) => !s.revoked).slice(0, 1).map((s: any) => (
          <div key={s.id} style={{ textAlign: 'center', marginBottom: 8 }} data-testid="share-link">
            <div className="qr-box"><QRCodeSVG value={`${window.location.origin}/s/${s.token}`} size={110} /></div>
            <p className="small muted" style={{ margin: '6px 0' }} dir="ltr">{t('ends')}: {new Date(s.expires_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
            <div className="row" style={{ justifyContent: 'center' }}>
              <a className="btn small primary" href={`/s/${s.token}`} data-testid="open-share">{t('open')}</a>
              <button className="btn small" data-testid="stop-share" onClick={() => call(`/share/${s.id}`, { method: 'DELETE' }).then(() => load())}>{t('stop')}</button>
            </div>
          </div>
        ))}
        {!d.shares.some((s: any) => !s.revoked) && <button className="btn primary" style={{ width: '100%' }} data-testid="make-share" onClick={() => post('/share')}>{t('makeshare')}</button>}
      </section>
      <section className="pt-card" data-testid="pt-access">
        <h3>{t('who')}</h3>
        {d.access.map((a: any, i: number) => <div key={i} className="list-line small" dir="ltr" style={{ textAlign: 'left' }}><strong>{a.who}</strong><div className="muted">{a.what}</div></div>)}
      </section>
      {d.family_name && <section className="pt-card small"><strong>{t('family')}:</strong> <span dir="ltr">{d.family_name}</span></section>}
    </div>}

    {report && <div className="pt-report" onClick={() => setReport(null)} data-testid="pt-report"><img src={report} alt="Original report" /><button className="btn">✕</button></div>}
  </>, nav);
}
