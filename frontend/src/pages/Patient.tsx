import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, post, prettyDate } from '../api';
import { Loading, SourceChip, SourceProvider, Sparkline } from '../components';

const QUICK = ['Pichli visit se kya change hua?', 'Which medicines are on record?'];
const DOC_NAMES: Record<string, string> = { lab_report: 'Lab report', prescription: 'Prescription', summary: 'Hospital letter' };

function AskPanel({ patientId }: { patientId: string }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const send = async (q: string) => {
    setQuestion(q); setBusy(true); setError(''); setAnswer(null);
    try { setAnswer(await post(`/patients/${patientId}/ask`, { question: q })); }
    catch (e: any) { setError(e.message); }
    setBusy(false);
  };
  const submit = (e: FormEvent) => { e.preventDefault(); if (question.trim()) send(question.trim()); };
  const rtl = ((answer?.answer || '').match(/[؀-ۿ]/g) || []).length > ((answer?.answer || '').match(/[A-Za-z]/g) || []).length;
  return (
    <section className="card">
      <h2>Ask about this patient</h2>
      <p className="small muted" style={{ marginBottom: 10 }}>Ask in Urdu or English. Answers come only from this patient's records.</p>
      <form onSubmit={submit} className="row" style={{ flexWrap: 'nowrap' }}>
        <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Type a question" data-testid="ask-input" aria-label="Question" />
        <button className="btn primary" disabled={busy} data-testid="ask-send">Ask</button>
      </form>
      <div className="row" style={{ marginTop: 9 }}>
        {QUICK.map((q) => <button key={q} className="chip" style={{ background: 'white' }} onClick={() => send(q)}>{q}</button>)}
      </div>
      {busy && <p className="muted" style={{ marginTop: 14 }}>Searching the records...</p>}
      {error && <div className="notice red" style={{ marginTop: 14 }}>{error}</div>}
      {answer && (
        <div className="notice brand" style={{ marginTop: 14 }} data-testid="ask-answer">
          <p className={rtl ? 'urdu' : ''}>{answer.answer}</p>
          <div className="row" style={{ marginTop: 8 }}><SourceChip ids={answer.sources} label={answer.sources.length > 1 ? `${answer.sources.length} sources` : 'Source'} /></div>
        </div>
      )}
    </section>
  );
}

export default function Patient() {
  const { id } = useParams();
  const [p, setP] = useState<any>(null);
  useEffect(() => { api(`/patients/${id}`).then(setP); }, [id]);
  if (!p) return <Loading />;
  const trend = p.trends[0];
  return (
    <SourceProvider>
      <main className="page stack">
        <section className="card">
          <div className="between">
            <div>
              <h1>{p.name}</h1>
              <p className="sub">{p.age} years, {p.sex}. File no {p.mrn}.</p>
            </div>
            <div className="row">
              {p.visit && <Link className="btn" to={`/visits/${p.id}/${p.visit.id}`} data-testid="start-visit">Start today's visit</Link>}
              <Link className="btn primary big" to={`/patients/${p.id}/story`} data-testid="play-story">▶ Play patient story</Link>
            </div>
          </div>
          <div className="facts-strip">
            <div><h3>Conditions</h3>{p.conditions.map((c: any) => <div key={c.id}>{c.label} <SourceChip ids={[c.id]} label="Source" /></div>)}{!p.conditions.length && <span className="muted">None on record</span>}</div>
            <div><h3>Allergies</h3>{p.allergies.map((a: any) => <div key={a.id}><strong style={{ color: 'var(--red)' }}>{a.label}</strong> <SourceChip ids={[a.id]} label="Source" /></div>)}{!p.allergies.length && <span className="muted">None on record</span>}</div>
            <div><h3>Medicines on record</h3>{p.medicines.map((m: any) => <div key={m.id}>{m.label} {m.value_text} <SourceChip ids={[m.id]} label="Source" /></div>)}{!p.medicines.length && <span className="muted">None on record</span>}</div>
          </div>
        </section>

        {trend && (
          <section className="card slow" data-testid="slow-change">
            <div className="slow-icon">!</div>
            <div>
              <h2 style={{ marginBottom: 2 }}>Slow change found</h2>
              <p>{trend.summary} {trend.detail}</p>
              <p className="small muted">For doctor review. ClinicMind does not say why this happened.</p>
            </div>
            <SourceChip ids={trend.fact_ids} label={`See all ${trend.count} reports`} />
          </section>
        )}

        {p.pending > 0 && <div className="notice amber">{p.pending} unclear value is waiting to be checked and is not used in this page's trends. <Link to="/needs-checking" style={{ fontWeight: 600, textDecoration: 'underline' }}>Check it now</Link></div>}

        <div className="two">
          <div className="stack">
            <section className="card">
              <h2>What changed since the last visit</h2>
              {p.changes.since && <p className="small muted" style={{ marginBottom: 6 }}>Last visit: {prettyDate(p.changes.since)}</p>}
              {p.changes.items.map((c: any, i: number) => <div key={i} className="list-line between"><span>{c.text}</span><SourceChip ids={[c.fact_id]} label="Source" /></div>)}
              {!p.changes.items.length && <p className="muted">No new records since the last visit.</p>}
              {p.missing.map((m: any) => <div key={m.code} className="notice amber" style={{ marginTop: 10 }}><strong>Missing record:</strong> {m.text}</div>)}
            </section>
            <section className="card">
              <h2>Test results over time</h2>
              <div className="lab-grid">
                {Object.entries<any[]>(p.labs).map(([code, rows]) => {
                  const last = rows[rows.length - 1];
                  return (
                    <div key={code} className="lab-card">
                      <div className="between"><strong>{last.label}</strong><SourceChip ids={rows.map((r) => r.id)} label={`${rows.length}`} /></div>
                      <div className="big-value">{last.value_num} <span className="small muted">{last.unit}</span></div>
                      <Sparkline points={rows.map((r) => ({ value: r.value_num }))} />
                      <p className="small muted">Normal: {last.normal_range}. Latest: {prettyDate(last.date)}</p>
                    </div>
                  );
                })}
              </div>
            </section>
            <section className="card">
              <h2>Medicine history</h2>
              <table>
                <thead><tr><th>Date</th><th>Medicine</th><th>How often</th><th /></tr></thead>
                <tbody>
                  {[...p.medicine_history].reverse().map((m: any) => (
                    <tr key={m.id}>
                      <td>{prettyDate(m.date)}</td><td>{m.label} {m.value_text}</td><td>{m.frequency}</td>
                      <td>{m.status === 'needs_review' ? <span className="tag">Being checked</span> : <SourceChip ids={[m.id]} label="Source" />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
          <div className="stack">
            <AskPanel patientId={p.id} />
            <section className="card">
              <h2>Patient's documents</h2>
              {p.timeline.slice(0, 22).map((d: any) => (
                <div key={d.id} className="list-line between small"><span>{DOC_NAMES[d.doc_type] || 'Document'}</span><span className="muted">{prettyDate(d.date)}</span></div>
              ))}
            </section>
          </div>
        </div>
      </main>
    </SourceProvider>
  );
}
